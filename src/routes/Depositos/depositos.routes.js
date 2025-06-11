import { Router } from "express";
import { prisma } from '../../db.js';
import { format } from 'date-fns';
import path from 'path'
import multer from 'multer'


const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'boletas/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
};

const upload = multer({ storage, fileFilter });


// Leer todos los depósitos por proyecto
router.get('/depositos', async (req, res) => {
  //const { proyectoId } = req.params;
  const { page = 1, limit = 10, descripcion, fechaInicio, fechaFin, operacionesBancarias } = req.query;


  try {
    const filters = {
      // proyectoId: parseInt(proyectoId),
      ...(descripcion && { descripcion: { contains: descripcion, mode: 'insensitive' } }),
      ...(operacionesBancarias && { operacionesBancarias: { contains: operacionesBancarias, mode: 'insensitive' } }),
      ...(fechaInicio && fechaFin && {
        fecha: { gte: new Date(fechaInicio), lte: new Date(fechaFin) }
      }),
    };

    const depositos = await prisma.deposito.findMany({
      where: filters,
      skip: (page - 1) * limit,
      take: parseInt(limit),
      //orderBy: { fecha: 'asc' },
      orderBy: { id: 'desc' },
    })
    const totalDepositos = await prisma.deposito.count({
      where: filters,
    });

    const formattedDepositos = depositos.map((deposito) => ({
      ...deposito,
      fecha: format(deposito.fecha, 'yyyy-MM-dd'),
      boleta: deposito.boleta
        ? `${req.protocol}://${req.get('host')}/${deposito.boleta.replace(/\\/g, '/')}`
        : null,
    }));

    res.json({

      depositos: formattedDepositos,
      totalPages: Math.ceil(totalDepositos / limit),
      currentPage: parseInt(page),
    })

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los depósitos.' });

  }

});

router.get('/todosd', async (req, res) => {
  //const { proyectoId } = req.params;

  try {
    const lotes = await prisma.deposito.findMany({
      orderBy: { id: 'desc' },
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
router.post('/depositos', upload.single('boleta'), async (req, res) => {
  const { fecha, descripcion, operacionesBancarias, arch, dinero } = req.body;

  const [year, month, day] = fecha.split('-');
  const fechaLocal = new Date(year, month - 1, day); // Crear fecha local sin desfase

  try {
    const dineroNum = parseFloat(dinero);
    const boletaPath = req.file ? req.file.path : null;
    const nuevoDeposito = await prisma.deposito.create({
      data: {
        fecha: fechaLocal,
        descripcion,
        operacionesBancarias,
        arch,
        dinero: dineroNum,
        boleta: boletaPath,
        //proyectoId: parseInt(proyectoId), // Asociar al proyecto
      },
    });
    res.json(nuevoDeposito);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el depósito.' });
  }
});

router.put('/depositos/:id',upload.single('boleta'), async (req, res) => {
  const { id } = req.params;
  const { fecha, descripcion, operacionesBancarias, dinero, arch } = req.body;

  try {
    // Verificar si `fecha` es válida antes de procesarla
    let fechaLocal = null;
    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) { // Verificar formato YYYY-MM-DD
      const [year, month, day] = fecha.split('-');
      fechaLocal = new Date(year, month - 1, day);
    }

    if (fechaLocal && isNaN(fechaLocal.getTime())) {
      return res.status(400).json({ error: "Fecha inválida" });
    }

    const dineroNumn = parseFloat(dinero);

    // Construir el objeto de datos a actualizar
    const dataToUpdate = {
      ...(fechaLocal && { fecha: fechaLocal }), // Actualizar solo si es válida
      descripcion,
      dinero: dineroNumn,
      arch,
      operacionesBancarias,
    };

    // Si se subió una nueva boleta, incluirla
    if (req.file) {
      dataToUpdate.boleta = req.file.path;
    }

    // Actualizar en la base de datos
    const depositoActualizado = await prisma.deposito.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
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
