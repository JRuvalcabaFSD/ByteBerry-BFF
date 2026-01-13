#!/bin/sh
# Modo estricto y MODO DE DEPURACIÓN (para auditoría)
set -eux

VERSION_TO_INJECT="$1"

echo "AUDIT: Versión recibida como argumento: ${VERSION_TO_INJECT}"

if [ -z "$VERSION_TO_INJECT" ]; then
    echo "ERROR: No se proporcionó la versión para la inyección." >&2
    exit 1
fi

echo "Actualizando package.json con jq a la versión: ${VERSION_TO_INJECT}"

# CAMBIO CLAVE: Usar jq para establecer el valor de 'version' y sobrescribir el archivo
jq ".version = \"$VERSION_TO_INJECT\"" package.json > package.json.tmp
mv package.json.tmp package.json

# Auditoría final
echo "AUDIT: Contenido de package.json después de la actualización con jq:"
grep "version" package.json
