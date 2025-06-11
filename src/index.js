import express from 'express'
//import ProductsRoutes from './routes/products.routes.js'
//import CategoriesRoutes from './routes/categories.routes.js'

import lotesSeparadosRoutes from './routes/LotesSeparados/lotesSeparados.routes.js'
import lotesVendidosRoutes from './routes/LotesVendidos/lotesVendidos.routes.js'
import Proyectos from './routes/Proyecto/proyectos.routes.js'
import Depositos from './routes/Depositos/depositos.routes.js' 
import authRoutes from './routes/auth.routes.js'
import Plano from './routes/Planos/plano.routes.js'
import Informes from './routes/Informes/informes.routes.js'

import {authMiddleware} from './middlewares/authMiddleware.js'

import cors from "cors"


const app = express()
app.use(cors({
    origin: '*'
})); 



app.use(express.json())

//app.use('/api', ProductsRoutes)
//app.use('/api', CategoriesRoutes)
app.use('/api', authRoutes)
app.use('/api',authMiddleware, Informes)

app.use('/api',authMiddleware, Proyectos)
app.use('/api',authMiddleware, lotesSeparadosRoutes)
app.use('/api',authMiddleware, lotesVendidosRoutes)
app.use('/api',authMiddleware, Depositos)
app.use('/api',authMiddleware, Plano)
app.use('/boletas', express.static('boletas'));



app.listen(3000)
console.log('Server on port', 3000)