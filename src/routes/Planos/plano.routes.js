import { Router } from "express";
import { prisma } from '../../db.js';

const router = Router();

// Crear un nuevo plano
router.post('/planos', async (req, res) => {
  const { x, y, width, height, estado, manlote, proyectoId } = req.body;
  try {
    const plano = await prisma.plano.create({
      data: { x, y,width ,height , estado, manlote, proyectoId },
    });
    res.status(201).json(plano);
  } catch (error) {
    res.status(500).json({ error: 'Error creando el plano', details: error.message });
  }
});

// Obtener planos por proyecto
router.get('/planos/:proyectoId', async (req, res) => {
  const { proyectoId } = req.params;
  try {
    const planos = await prisma.plano.findMany({
      where: { proyectoId: parseInt(proyectoId) },
    });
    res.status(200).json(planos);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo planos', details: error.message });
  }
});

// Actualizar un plano
router.put('/planos/:id', async (req, res) => {
  const { id } = req.params;
  const { x, y,width,height, estado, manlote } = req.body;
  try {
    const plano = await prisma.plano.update({
      where: { id: parseInt(id) },
      data: { x, y,width,height, estado, manlote },
    });
    res.status(200).json(plano);
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando el plano', details: error.message });
  }
});

// Eliminar un plano
router.delete('/planos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.plano.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando el plano', details: error.message });
  }
});

export default router;
