import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/*
router.get('/', async (req, res) => {
    const { page = 1, limit = 10, tarea } = req.query;
  
    try {
      const filters = {
        ...(tarea && { tarea: { contains: tarea, mode: 'insensitive' } }),
      };
  
      const informes = await prisma.informe.findMany({
        where: filters,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { id: 'desc' }, //  Ordenar por ID descendente
      });
  
      const totalInformes = await prisma.informe.count({ where: filters });
  
      res.json({
        informes,
        totalPages: Math.ceil(totalInformes / limit),
        currentPage: parseInt(page),
        totalInformes,
      });
    } catch (error) {
      console.error('Error al obtener los informes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
*/
router.get('/informes', async (req, res) => {

  const { page = 1, limit = 10, tarea } = req.query;

  try {
    const filters = {

      ...(tarea && { tarea: { contains: tarea, mode: 'insensitive' } }),

    };

    const lotes = await prisma.informe.findMany({
      where: filters,
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const totalLotes = await prisma.informe.count({
      where: filters,
    });

    res.json({
      lotes,
      totalPages: Math.ceil(totalLotes / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los informes.' });
  }
});

router.get('/todosi', async (req, res) => {


  try {
    const lotes = await prisma.informe.findMany({

    });

    res.json({ lotes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los informes.' });
  }
});



// Obtener un informe por ID
router.get("/informes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const informe = await prisma.informe.findUnique({
      where: { id: Number(id) }
    });

    if (!informe) {
      return res.status(404).json({ error: "Informe no encontrado" });
    }

    res.json(informe);
  } catch (error) {
    console.error("Error al obtener el informe:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Crear un nuevo informe
router.post("/informes", async (req, res) => {
  const { tarea, descripcion } = req.body;

  if (!tarea || !descripcion) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    const nuevoInforme = await prisma.informe.create({
      data: { tarea, descripcion }
    });


    res.status(201).json({
      message: 'Informe creado correctamente',
      informe: nuevoInforme,
    });
  } catch (error) {
    console.error("Error al crear el informe:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Actualizar un informe por ID
router.put("/informes/:id", async (req, res) => {
  const { id } = req.params;
  const { tarea, descripcion } = req.body;

  try {
    const informeExistente = await prisma.informe.findUnique({
      where: { id: Number(id) }
    });

    if (!informeExistente) {
      return res.status(404).json({ error: "Informe no encontrado" });
    }

    const informeActualizado = await prisma.informe.update({
      where: { id: Number(id) },
      data: { tarea, descripcion }
    });

    res.json({
      message: 'Informe actualizado correctamente',
      informe: informeActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar el informe:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Eliminar un informe por ID
router.delete("/informes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const informeExistente = await prisma.informe.findUnique({
      where: { id: Number(id) }
    });

    if (!informeExistente) {
      return res.status(404).json({ error: "Informe no encontrado" });
    }

    await prisma.informe.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Informe eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar el informe:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get('/users', async (req, res) => {
  const { page = 1, limit = 10, email } = req.query;

  try {
    const filters = {
      ...(email && { email: { contains: email, mode: 'insensitive' } })
    };


    const users = await prisma.user.findMany({
      where: filters,
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const totalUsers = await prisma.user.count({ where: filters });

    res.json({
      users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    res.status(500).json({ error: 'Error al obtener los usuarios.' });
  }
});


router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, firstName, lastName, role } = req.body;

  try {
    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        email,
        firstName,
        lastName,
        role
      }
    });
    res.json(updatedUser);

  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    res.status(500).json({ error: 'Error al actualizar el usuario.' });
  }
});
// Ruta para eliminar un usuario
router.delete('/deleteu/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Eliminar el usuario
    await prisma.user.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    res.status(500).json({ error: 'Ocurrió un error al eliminar el usuario.' });
  }
});


export default router;

