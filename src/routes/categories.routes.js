import {Router} from 'express';
import { PrismaClient } from '@prisma/client/extension';    

const router = Router();


router.get('/categories', (req, res) => {
    res.send('GET /categories')
})


export default router;