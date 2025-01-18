import { Router } from "express";
import { prisma } from '../../db.js';
import { format } from 'date-fns';


const router = Router();

// Leer todos los depósitos por proyecto
router.get('/depositos/:proyectoId', async (req, res) => {
  const { proyectoId } = req.params;
  const {page = 1, limit = 10, descripcion, fechaInicio, fechaFin, operacionesBancarias} = req.query;


  try {
    const filters = {
      proyectoId: parseInt(proyectoId),
      ...(descripcion && { descripcion: {contains: descripcion, mode: 'insensitive'}}),
      ...(operacionesBancarias && {operacionesBancarias: {contains: operacionesBancarias, mode: 'insensitive'}}),
      ...(fechaInicio && fechaFin && { 
        fecha: { gte: new Date(fechaInicio), lte: new Date(fechaFin) } 
      }),
    };

    const depositos = await prisma.deposito.findMany({
      where: filters,
      skip: (page-1) * limit,
      take: parseInt(limit),
      orderBy: { fecha: 'asc' },
    })
    const totalDepositos = await prisma.deposito.count({
      where:filters,
    });
    const formattedDepositos = depositos.map((dep) => ({
      ...dep,
      fecha: format(dep.fecha, 'dd-MM-yyyy'), // Formato de fecha
    }));

    res.json({
      depositos : formattedDepositos,
      totalPages: Math.ceil(totalDepositos / limit),
      currentPage: parseInt(page),
    })
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los depósitos.' });
    
  }

});

router.get('/todosd/:proyectoId', async (req, res) => {
  const { proyectoId } = req.params;

  try {
    const lotes = await prisma.deposito.findMany({
      where: { proyectoId: parseInt(proyectoId) },
    });
    const formattedDepositos = lotes.map((dep) => ({
      ...dep,
      fecha: format(dep.fecha, 'dd-MM-yyyy'), // Formato de fecha
    }));

    //res.json({ lotes });
    res.json({ lotes: formattedDepositos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los lotes separados.' });
  }
});

// Crear un nuevo depósito
router.post('/depositos', async (req, res) => {
  const { fecha, descripcion, operacionesBancarias, dinero, proyectoId } = req.body;

  const [year, month, day] = fecha.split('-');
  const fechaLocal = new Date(year, month - 1, day); // Crear fecha local sin desfase

  try {
    const dineroNum = parseFloat(dinero);
    const nuevoDeposito = await prisma.deposito.create({
      data: {
        fecha: fechaLocal,
        descripcion,
        operacionesBancarias,
        dinero: dineroNum,
        proyectoId: parseInt(proyectoId), // Asociar al proyecto
      },
    });
    res.json(nuevoDeposito);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el depósito.' });
  }
});

// Actualizar un depósito
router.put('/depositos/:id', async (req, res) => {
  const { id } = req.params;
  const { fecha, descripcion, operacionesBancarias, dinero, proyectoId } = req.body;

  const [year, month, day] = fecha.split('-');
  const fechaLocal = new Date(year, month - 1, day); // Crear fecha local sin desfase

  try {
    const dineroNumn = parseFloat(dinero);

    const depositoActualizado = await prisma.deposito.update({
      where: { id: parseInt(id) },
      data: {
        fecha: fechaLocal,
        descripcion,
        dinero: dineroNumn,
        operacionesBancarias,
        //proyectoId: parseInt(proyectoId), // Actualizar proyecto si es necesario
      },
    });
    res.json(depositoActualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el depósito.' });
  }
});

// Eliminar un depósito
router.delete('/depositos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.deposito.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Depósito eliminado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el depósito.' });
  }
});

export default router;
