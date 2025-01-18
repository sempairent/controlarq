import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/separar', async (req, res) => {
  const { nombre, apellido, dni, celular, mzYLote,financiado, adelanto, total, asesor, proyectoId } = req.body;

  try {
    // Verificar si existe un lote con el mismo mzYLote en el mismo proyecto en loteSeparado o loteVendido
    const loteExistenteEnSeparados = await prisma.loteSeparado.findFirst({
      where: {
        mzYLote,
        proyectoId,
      },
    });

    const loteExistenteEnVendidos = await prisma.loteVendido.findFirst({
      where: {
        mzYLote,
        proyectoId,
      },
    });
    /*
        if (loteExistenteEnSeparados || loteExistenteEnVendidos) {
          return res.status(400).json({
            error: `El lote ${mzYLote} ya está reservado o vendido en este proyecto.`,
          });
        }
    */
    // Verificar en qué tabla está
    if (loteExistenteEnSeparados) {
      return res.status(400).json({
        error: `El lote ${mzYLote} ya está reservado en Lotes Separados`,
      });
    }

    if (loteExistenteEnVendidos) {
      return res.status(400).json({
        error: `El lote ${mzYLote} ya está vendido en Lotes Vendidos`,
      });
    }
    // Crear el lote separado
    const nuevoLote = await prisma.loteSeparado.create({
      data: {
        nombre,
        apellido,
        dni,
        celular,
        mzYLote,
        financiado,
        adelanto: parseFloat(adelanto),
        total: parseFloat(total),
        asesor,
        proyectoId, // Asociar al proyecto
      },
    });

    // Verificar si el adelanto es igual al total y mover a LotesVendidos
    if (adelanto === total) {
      await prisma.loteSeparado.delete({ where: { id: nuevoLote.id } });
      const loteVendido = await prisma.loteVendido.create({
        data: {
          nombre,
          apellido,
          dni,
          celular,
          mzYLote,
          financiado,
          adelanto,
          total,
          asesor,
          proyectoId, // Mantener asociación al proyecto
        },
      });

      return res.json({
        message: 'Lote pagado completamente y movido a Lotes Vendidos.',
        lote: loteVendido,
      });
    }

    //res.json(nuevoLote);
    return res.json({
      message: 'Lote separado creado correctamente.',
      lote: nuevoLote,
    })
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

    res.json({
      lotes,
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
router.put('/separar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, dni, celular, mzYLote,financiado, adelanto, total, asesor, proyectoId } = req.body;

  try {
    const adelantoNum = parseFloat(adelanto);
    const totalNum = parseFloat(total);

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
        error: `El lote ${mzYLote} ya está reservado en los Lotes Separados.`,
      });
    }

    if (loteExistenteEnVendidos) {
      return res.status(400).json({
        error: `El lote ${mzYLote} ya está vendido en los Lotes Vendidos.`, 
      });
    }

    const loteActualizado = await prisma.loteSeparado.update({
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
        proyectoId, // Actualizar el proyecto si es necesario
      },
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
        },
      });

      return res.json({
        message: 'Lote actualizado y movido a Lotes Vendidos.',
        lote: loteVendido,
      });
    }

    //res.json(loteActualizado);
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



