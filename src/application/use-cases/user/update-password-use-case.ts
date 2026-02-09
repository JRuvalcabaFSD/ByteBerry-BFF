import { Injectable, LogContextClass, LogContextMethod } from '@shared';
import type { UpdatePasswordRequest, UpdatePasswordResponse } from '@application';
import type { IConfig, IHttpClient, ILogger, IUpdateUserPasswordUseCase } from '@interfaces';

/**
 * Caso de uso para actualizar la contraseña de un usuario.
 *
 * Esta clase implementa la lógica para actualizar la contraseña de un usuario autenticado,
 * delegando la operación a un servicio OAuth2 externo mediante una solicitud HTTP PUT.
 *
 * @implements {IUpdateUserPasswordUseCase}
 */

@LogContextClass()
@Injectable({ name: 'UpdateUserPasswordUseCase', depends: ['Config', 'HttpClient', 'Logger'] })
export class UpdatePasswordUseCase implements IUpdateUserPasswordUseCase {
	private readonly oauth2BaseUrl: string;

	/**
	 * Crea una instancia de UpdatePasswordUseCase.
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
	 * Ejecuta la actualización de la contraseña del usuario.
	 *
	 * Realiza una solicitud PUT al endpoint del servicio OAuth2 para actualizar la contraseña del usuario actual,
	 * utilizando el token de acceso para autenticación.
	 *
	 * @param accessToken - Token de acceso del usuario para autenticar la solicitud.
	 * @param data - Datos de la solicitud de actualización de contraseña.
	 * @returns Una promesa que resuelve con la respuesta de actualización de contraseña.
	 */

	@LogContextMethod()
	public async execute(accessToken: string, data: UpdatePasswordRequest): Promise<UpdatePasswordResponse> {
		this.logger.debug('Proxying password update to OAuth2');

		const response = await this.client.put<UpdatePasswordResponse>(`${this.oauth2BaseUrl}/user/me/password`, data, {
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
