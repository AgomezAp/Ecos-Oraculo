import { Router } from 'express';

import { registrarDatos } from '../controllers/datos';

const router = Router();

router.post('/api/registrar', registrarDatos);

export default router;