import UserFreeTrial from '../models/UserFreeTrail';

export class FreetrialService {
  /**
   * Inicializa un usuario nuevo con la configuración de la etapa de Onboarding.
   */
  static async createUser(whatsappNumber: string) {
    const user = new UserFreeTrial({ whatsappNumber });
    await user.save();
    return user;
  }



}