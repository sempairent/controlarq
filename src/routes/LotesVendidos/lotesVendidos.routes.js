import { Router } from "express";
import { prisma } from '../../db.js';
import multer from 'multer';
import path from 'path';

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

// Leer todos los lotes vendidos por proyecto
router.get('/vendidos/:proyectoId', async (req, res) => {
  const { proyectoId } = req.params;
  const { page = 1, limit = 10, dni, mzYLote, asesor, financiado } = req.query;
  /*
    try {
      const lotesVendidos = await prisma.loteVendido.findMany({
        where: { proyectoId: parseInt(proyectoId) },
      });
      res.json(lotesVendidos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener los lotes vendidos.' });
    }
    */
  try {
    const filters = {
      proyectoId: parseInt(proyectoId),
      ...(dni && { dni: { contains: dni, mode: 'insensitive' } }),
      ...(mzYLote && { mzYLote: { contains: mzYLote, mode: 'insensitive' } }),
      ...(asesor && { asesor: { contains: asesor, mode: 'insensitive' } }),
      ...(financiado && { financiado: { contains: financiado, mode: 'insensitive' } }),
    };

    const lotes = await prisma.loteVendido.findMany({
      where: filters,
      skip: (page - 1) * limit,
      take: parseInt(limit),
    })
    const totalLotes = await prisma.loteVendido.count({
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
    })

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los lotes vendidos.' })

  }
});

router.get('/todosv/:proyectoId', async (req, res) => {
  const { proyectoId } = req.params;

  try {
    const lotes = await prisma.loteVendido.findMany({
      where: { proyectoId: parseInt(proyectoId) },
    });

    res.json({ lotes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los lotes separados.' });
  }
});

// Crear un lote vendido
router.post('/vendidos',upload.single('boleta'), async (req, res) => {
  const { nombre, apellido, dni, celular, mzYLote, financiado, adelanto, total, asesor, proyectoId } = req.body;

  try {
    const adelantoNum = parseFloat(adelanto);
    const totalNum = parseFloat(total);
    const proyectoIdInt = parseInt(proyectoId,10);

    const loteExistenteEnSeparados = await prisma.loteSeparado.findFirst({
      where: {
        mzYLote,
        proyectoId: proyectoIdInt,
      },
    });

    const loteExistenteEnVendidos = await prisma.loteVendido.findFirst({
      where: {
        mzYLote,
        proyectoId: proyectoIdInt,
      },
    });

    // Verificar en qué tabla está
    if (loteExistenteEnSeparados) {
      return res.status(400).json({
        error: `El lote ${mzYLote} ya está reservado en Lotes separados.`,
      });
    }

    if (loteExistenteEnVendidos) {
      return res.status(400).json({
        error: `El lote ${mzYLote} ya está vendido en Lotes Vendidos.`,
      });
    }
    const boletaPath = req.file ? req.file.path : null;

    const nuevoLoteVendido = await prisma.loteVendido.create({
      data: {
        nombre,
        apellido,
        dni,
        celular,
        mzYLote,
        financiado,
        adelanto: adelantoNum,
        total: totalNum,
        asesor,
        proyectoId: proyectoIdInt, // Asociar al proyecto
        boleta: boletaPath,
      },
    });
    //res.json(nuevoLoteVendido);
    return res.json({
      message: 'Lote vendido creado correctamente.',
      lote: nuevoLoteVendido,
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el lote vendido.' });
  }
});

// Actualizar un lote vendido
router.put('/vendidos/:id', upload.single('boleta'), async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, dni, celular, mzYLote, financiado, adelanto, total, asesor, proyectoId: proyectoIdRaw } = req.body;

  const adelantoNum = parseFloat(adelanto);
  const totalNum = parseFloat(total);
  const proyectoId = parseInt(proyectoIdRaw);
  //const idInt = parseInt(id);

  try {
    const loteExistenteEnSeparados = await prisma.loteSeparado.findFirst({
      where: {
        mzYLote,
        proyectoId,
        NOT: {
          id: parseInt(id), // Excluir el lote actual por ID
        },
      },
    });

    const loteExistenteEnVendidos = await prisma.loteVendido.findFirst({
      where: {
        mzYLote,
        proyectoId,
        NOT: {
          id: parseInt(id), // Excluir el lote actual por ID
        },
      },
    });
    // Verificar en qué tabla está
    if (loteExistenteEnSeparados) {
      return res.status(400).json({
        error: `El lote ${mzYLote} ya está reservado en los Lotes Separados`,
      });
    }

    if (loteExistenteEnVendidos) {
      return res.status(400).json({
        error: `El lote ${mzYLote} ya está vendido en los Lotes Vendidos`,
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
      proyectoId: parseInt(proyectoId),
    }

    if (req.file) {
      dataToUpdate.boleta = req.file.path;
    }
    const loteActualizado = await prisma.loteVendido.update({
      where: {
        id: parseInt(id)
      },
      data: dataToUpdate,
    });
    /*

    const loteActualizado = await prisma.loteVendido.update({
      where: { id: parseInt(id) },
      data: {
        nombre,
        apellido,
        dni,
        celular,
        mzYLote,
        financiado,
        adelanto: adelantoNum,
        total: totalNum,
        asesor,
        proyectoId: parseInt(proyectoId), // Actualizar el proyecto si es necesario
      },
    });*/

    if (adelantoNum < totalNum) {
      await prisma.loteVendido.delete({ where: { id: loteActualizado.id } });
      const loteSeparado = await prisma.loteSeparado.create({
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
        }
      });
      return res.json({
        message: 'Lote actualizado y movido a Lotes Separados.',
        lote: loteSeparado,
      });
    }

    //res.json(loteActualizado);
    return res.json({
      message: 'Lote actualizado correctamente.',
      lote: loteActualizado,
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el lote vendido.' });
  }
});

// Eliminar un lote vendido
router.delete('/vendidos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.loteVendido.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Lote vendido eliminado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el lote vendido.' });
  }
});

export default router;
