import {Router} from 'express';
import {prisma} from '../db.js';    

const router = Router();


router.get('/products', async (req, res) => {
    const products = await prisma.product.findMany()
    res.json(products)
})

export default router;