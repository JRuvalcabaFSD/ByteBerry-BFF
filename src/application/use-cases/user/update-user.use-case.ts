import { Injectable, LogContextClass, LogContextMethod } from '@shared';
import type { UpdateUserRequest, UpdateUserResponse } from '@application';
import type { IConfig, IHttpClient, ILogger, IUpdateProfileUseCase } from '@interfaces';

/**
 * Caso de uso para actualizar el perfil de un usuario.
 *
 * Esta clase implementa la lógica para actualizar el perfil de un usuario autenticado,
 * delegando la operación a un servicio OAuth2 externo mediante una solicitud HTTP PUT.
 *
 * @implements {IUpdateProfileUseCase}
 */

@LogContextClass()
@Injectable({ name: 'UpdateProfileUseCase', depends: ['Config', 'HttpClient', 'Logger'] })
export class UpdateUserUseCase implements IUpdateProfileUseCase {
	private readonly oauth2BaseUrl: string;

	/**
	 * Crea una instancia de UpdateUserUseCase.
	 *
	 * @param config - Configuración de la aplicación, utilizada para obtener la URL base del servicio OAuth2.
	 * @param client - Cliente HTTP para realizar solicitudes externas.
	 * @param logger - Servicio de logging para registrar operaciones.
	 */

	constructor(
		config: IConfig,
		private readonly client: IHttpClient,
		private readonly logger: ILogger
	) {
		this.oauth2BaseUrl = config.oauth2ServiceUrl;
	}

	/**
	 * Ejecuta la actualización del perfil de usuario.
	 *
	 * Realiza una solicitud PUT al endpoint del servicio OAuth2 para actualizar el perfil del usuario actual,
	 * utilizando el token de acceso para autenticación.
	 *
	 * @param accessToken - Token de acceso del usuario para autenticar la solicitud.
	 * @param data - Datos de la solicitud de actualización del usuario.
	 * @returns Una promesa que resuelve con la respuesta de actualización del usuario.
	 */

	@LogContextMethod()
	public async execute(accessToken: string, data: UpdateUserRequest): Promise<UpdateUserResponse> {
		this.logger.debug('Proxying user profile update to OAuth2');

		const response = await this.client.put<UpdateUserResponse>(`${this.oauth2BaseUrl}/user/me`, data, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
			retry: true,
			maxRetries: 2,
		});

		return response.data;
	}
}
