import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

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

// 🔽 Aquí comienza la ruta que usa multer
router.post('/separar', upload.single('boleta'), async (req, res) => {
  // Desestructurar y convertir los campos necesarios
  const {
    nombre,
    apellido,
    dni,
    celular,
    mzYLote,
    financiado,
    adelanto,
    total,
    asesor,
    proyectoId
  } = req.body;

  // Conversión explícita
  const adelantoFloat = parseFloat(adelanto);
  const totalFloat = parseFloat(total);
  const proyectoIdInt = parseInt(proyectoId, 10); // 👈 conversión importante

  try {
    // Buscar si el lote ya existe
    const loteExistenteEnSeparados = await prisma.loteSeparado.findFirst({
      where: { mzYLote, proyectoId: proyectoIdInt },
    });

    const loteExistenteEnVendidos = await prisma.loteVendido.findFirst({
      where: { mzYLote, proyectoId: proyectoIdInt },
    });

    if (loteExistenteEnSeparados) {
      return res.status(400).json({ error: `El lote ${mzYLote} ya está reservado.` });
    }

    if (loteExistenteEnVendidos) {
      return res.status(400).json({ error: `El lote ${mzYLote} ya está vendido.` });
    }

    const boletaPath = req.file ? req.file.path : null;

    // Crear el lote separado
    const nuevoLote = await prisma.loteSeparado.create({
      data: {
        nombre,
        apellido,
        dni,
        celular,
        mzYLote,
        financiado,
        adelanto: adelantoFloat,
        total: totalFloat,
        asesor,
        proyectoId: proyectoIdInt,
        boleta: boletaPath,
      },
    });

    // Si ya pagó todo, mover a "vendido"
    if (adelantoFloat === totalFloat) {
      await prisma.loteSeparado.delete({ where: { id: nuevoLote.id } });
      const dataToUpdate = {
        nombre,
        apellido,
        dni,
        celular,
        mzYLote,
        financiado,
        adelanto: adelantoFloat,
        total: totalFloat,
        asesor,
        proyectoId: proyectoIdInt,
      };
      if(req.file){
        dataToUpdate.boleta = req.file.path;
      }
      const loteVendido = await prisma.loteVendido.create({
        data: dataToUpdate,
      });

      return res.json({
        message: 'Lote pagado completamente y movido a Lotes Vendidos.',
        lote: loteVendido,
      });
    }

    return res.json({
      message: 'Lote separado creado correctamente.',
      lote: nuevoLote,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el lote separado.' });
  }
});



// Leer todos los lotes separados por proyecto
// Leer lotes separados con paginación y búsqueda
router.get('/separar/:proyectoId', async (req, res) => {
  const { proyectoId } = req.params;
  const { page = 1, limit = 10, dni, mzYLote, asesor, financiado } = req.query;

  try {
    const filters = {
      proyectoId: parseInt(proyectoId),
      ...(dni && { dni: { contains: dni, mode: 'insensitive' } }),
      ...(mzYLote && { mzYLote: { contains: mzYLote, mode: 'insensitive' } }),
      ...(asesor && { asesor: { contains: asesor, mode: 'insensitive' } }),
      ...(financiado && { financiado: { contains: financiado, mode: 'insensitive' } }),
    };

    const lotes = await prisma.loteSeparado.findMany({
      where: filters,
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const totalLotes = await prisma.loteSeparado.count({
      where: filters,
    });

    const lotesConBoletaUrl = lotes.map((lote) => ({
      ...lote,
      boleta: lote.boleta
        ? `${req.protocol}://${req.get('host')}/${lote.boleta.replace(/\\/g, '/')}`
        : null,
    }));

    res.json({
      lotes: lotesConBoletaUrl,
      totalPages: Math.ceil(totalLotes / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los lotes separados.' });
  }
});


router.get('/todos/:proyectoId', async (req, res) => {
  const { proyectoId } = req.params;

  try {
    const lotes = await prisma.loteSeparado.findMany({
      where: { proyectoId: parseInt(proyectoId) },
    });

    res.json({ lotes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los lotes separados.' });
  }
});



// Actualizar un lote separado
router.put('/separar/:id', upload.single('boleta'), async (req, res) => {
  console.log('Archivo recibido:', req.file);
  console.log('req.body:', req.body);
  const { id } = req.params;
  const {
    nombre,
    apellido,
    dni,
    celular,
    mzYLote,
    financiado,
    adelanto,
    total,
    asesor,
    proyectoId: proyectoIdRaw,
  } = req.body;

  const proyectoId = parseInt(proyectoIdRaw);
  const idInt = parseInt(id);
  const adelantoNum = parseFloat(adelanto);
  const totalNum = parseFloat(total);

  if (isNaN(proyectoId) || isNaN(idInt)) {
    return res.status(400).json({ error: 'ID o proyectoId inválido.' });
  }

  try {
    const loteExistenteEnSeparados = await prisma.loteSeparado.findFirst({
      where: {
        mzYLote,
        proyectoId,
        NOT: {
          id: idInt,
        },
      },
    });

    const loteExistenteEnVendidos = await prisma.loteVendido.findFirst({
      where: {
        mzYLote,
        proyectoId,
        NOT: {
          id: idInt,
        },
      },
    });

    if (loteExistenteEnSeparados) {
      return res.status(400).json({
        error: `El lote ${mzYLote} ya está reservado en los Lotes Separados.`,
      });
    }

    if (loteExistenteEnVendidos) {
      return res.status(400).json({
        error: `El lote ${mzYLote} ya está vendido en los Lotes Vendidos.`,
      });
    }

    const dataToUpdate = {
      nombre,
      apellido,
      dni,
      celular,
      mzYLote,
      financiado,
      adelanto: adelantoNum,
      total: totalNum,
      asesor,
      proyectoId,
    };

    if (req.file) {
      dataToUpdate.boleta = req.file.path;
    }

    const loteActualizado = await prisma.loteSeparado.update({
      where: { id: idInt },
      data: dataToUpdate,
    });

    if (adelantoNum === totalNum) {
      await prisma.loteSeparado.delete({ where: { id: loteActualizado.id } });

      const loteVendido = await prisma.loteVendido.create({
        data: {
          nombre: loteActualizado.nombre,
          apellido: loteActualizado.apellido,
          dni: loteActualizado.dni,
          celular: loteActualizado.celular,
          mzYLote: loteActualizado.mzYLote,
          financiado: loteActualizado.financiado,
          adelanto: loteActualizado.adelanto,
          total: loteActualizado.total,
          asesor: loteActualizado.asesor,
          proyectoId: loteActualizado.proyectoId,
          boleta: loteActualizado.boleta,
        },
      });

      return res.json({
        message: 'Lote actualizado y movido a Lotes Vendidos.',
        lote: loteVendido,
      });
    }

    res.json({
      message: 'El lote ha sido actualizado con éxito.',
      lote: loteActualizado,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el lote separado.' });
  }
});

// Eliminar un lote separado
router.delete('/separar/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.loteSeparado.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Lote separado eliminado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el lote separado.' });
  }
});

export default router;



