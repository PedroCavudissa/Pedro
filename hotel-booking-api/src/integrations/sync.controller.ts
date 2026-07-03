import { SyncService } from "./sync.service.js";

const syncService = new SyncService();

export const syncController = async (req, res) => {
  try {
    await syncService.syncAll();

    return res.json({
      success: true,
      message: "Sincronização concluída"
    });
  } catch (err) {
    return res.status(500).json({
      error: "Erro na sincronização"
    });
  }
};