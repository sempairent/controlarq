import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Crear un proyecto
router.post('/proyectos', async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const proyecto = await prisma.proyecto.create({
      data: { nombre, descripcion },
    });
    res.json(proyecto);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el proyecto', details: error.message });
  }
});

// Leer todos los proyectos
router.get('/proyectos', async (req, res) => {
  try {
    const proyectos = await prisma.proyecto.findMany({
     //include: { lotesSeparados: true, lotesVendidos: true, depositos: true },
    });
    res.json(proyectos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los proyectos', details: error.message });
  }
});

// Leer un proyecto por ID
router.get('/proyectos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: parseInt(id) },
      include: { lotesSeparados: true, lotesVendidos: true, depositos: true },
    });
    if (!proyecto) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json(proyecto);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el proyecto', details: error.message });
  }
});

// Actualizar un proyecto
router.put('/proyectos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    const proyectoActualizado = await prisma.proyecto.update({
      where: { id: parseInt(id) },
      data: { nombre, descripcion },
    });

    res.json(proyectoActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el proyecto', details: error.message });
  }
});

// Eliminar un proyecto
router.delete('/proyectos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.proyecto.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Proyecto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el proyecto', details: error.message });
  }
});

export default router;
