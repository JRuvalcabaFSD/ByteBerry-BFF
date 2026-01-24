#!/bin/bash

# ByteBerry BFF Service - Multi-arch Docker Build Script
# Supports: linux/amd64, linux/arm64 (Raspberry Pi 5)

set -e

# Configuration
DOCKER_HUB_REPO="jruvalcabafsd/byteberry-bff"
IMAGE_NAME="jruvalcabafsd/byteberry-bff"
PLATFORMS="linux/amd64,linux/arm64"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker buildx is available
check_buildx() {
    print_info "Checking Docker buildx support..."

    if ! docker buildx version >/dev/null 2>&1; then
        print_error "Docker buildx is not available. Please install Docker Desktop or enable buildx."
        exit 1
    fi

    print_success "Docker buildx is available"
}

# Create and use buildx builder
setup_builder() {
    print_info "Setting up multi-arch builder..."

    # Create builder if it doesn't exist
    if ! docker buildx inspect byteberry-builder >/dev/null 2>&1; then
        print_info "Creating new buildx builder: byteberry-builder"
        docker buildx create \
            --name byteberry-builder \
            --driver docker-container \
            --bootstrap
    fi

    # Use the builder
    docker buildx use byteberry-builder
    print_success "Builder 'byteberry-builder' is ready"
}

# Get version from package.json
get_version() {
    if command -v jq >/dev/null 2>&1; then
        VERSION=$(jq -r '.version' package.json)
    elif command -v node >/dev/null 2>&1; then
        VERSION=$(node -pe "require('./package.json').version")
    else
        print_warning "Cannot determine version from package.json"
        VERSION="latest"
    fi

    print_info "Building version: ${VERSION}"
}

# Build for development (single platform)
build_dev() {
    local platform=${1:-linux/amd64}

		local INJECTED_VERSION=${TEST_VERSION:-$VERSION}

    print_info "Building development image for ${platform} (Simulated version: ${INJECTED_VERSION})..."

    docker buildx build \
        --platform ${platform} \
				--build-arg VERSION="${INJECTED_VERSION}" \
        --tag ${IMAGE_NAME}:dev \
        --load \
        .

    print_success "Development image built successfully"
    print_info "Run with: docker run --rm -p 4002:4002 ${IMAGE_NAME}:dev"
}

# Build and push production (multi-platform)
build_prod() {
    print_info "Building production images for: ${PLATFORMS}..."

    # Build and push latest
    docker buildx build \
        --platform ${PLATFORMS} \
				--build-arg VERSION="${VERSION}" \
        --tag ${DOCKER_HUB_REPO}:latest \
        --tag ${DOCKER_HUB_REPO}:${VERSION} \
        --push \
        .

    print_success "Production images built and pushed successfully"
    print_info "Images available:"
    print_info "  - ${DOCKER_HUB_REPO}:latest"
    print_info "  - ${DOCKER_HUB_REPO}:${VERSION}"
}

# Test built image
test_image() {
    local image_tag=${1:-${IMAGE_NAME}:dev}

    print_info "Testing image: ${image_tag}..."

    # Start container in background
    CONTAINER_ID=$(docker run -d -p 4002:4002 ${image_tag})

    # Wait for container to start
    print_info "Waiting for container to start..."
    sleep 10

    # Test health endpoint
    if curl -f http://localhost:4002/health >/dev/null 2>&1; then
        print_success "Health check passed"
        TEST_RESULT=0
    else
        print_error "Health check failed"
        TEST_RESULT=1
    fi

    # Show container logs if test failed
    if [ $TEST_RESULT -ne 0 ]; then
        print_info "Container logs:"
        docker logs ${CONTAINER_ID}
    fi

    # Cleanup
    docker stop ${CONTAINER_ID} >/dev/null 2>&1
    docker rm ${CONTAINER_ID} >/dev/null 2>&1

    return $TEST_RESULT
}

# Inspect multi-arch manifest
inspect_manifest() {
    local image=${DOCKER_HUB_REPO}:${VERSION}

    print_info "Inspecting multi-arch manifest for: ${image}"

    if docker buildx imagetools inspect ${image} 2>/dev/null; then
        print_success "Multi-arch manifest inspection completed"
    else
        print_warning "Could not inspect manifest (image may not exist on registry)"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev [platform]    Build development image (default: linux/amd64)"
    echo "  prod              Build and push production multi-arch images"
    echo "  test [tag]        Test built image (default: byteberry-bff:dev)"
    echo "  inspect           Inspect multi-arch manifest on registry"
    echo "  setup             Setup buildx builder only"
    echo ""
    echo "Examples:"
    echo "  $0 dev                          # Build for current platform"
    echo "  $0 dev linux/arm64             # Build for ARM64 (Raspberry Pi)"
    echo "  $0 prod                         # Build and push multi-arch"
    echo "  $0 test                         # Test dev image"
    echo "  $0 test ${DOCKER_HUB_REPO}:latest  # Test specific image"
}

# Main execution
main() {
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run from project root."
        exit 1
    fi

    get_version

    case "${1:-}" in
        dev)
            check_buildx
            setup_builder
            build_dev "${2}"
            ;;
        prod)
            check_buildx
            setup_builder
            build_prod
            ;;
        test)
            test_image "${2}"
            ;;
        inspect)
            inspect_manifest
            ;;
        setup)
            check_buildx
            setup_builder
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            print_error "Unknown command: ${1:-}"
            usage
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"
