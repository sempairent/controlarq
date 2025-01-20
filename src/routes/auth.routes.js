import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();
const prisma = new PrismaClient();

// Clave secreta para JWT
const SECRET_KEY = "valentinedos"; 

// Ruta de Registro
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, role } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear nuevo usuario con rol
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName: firstName,
                lastName: lastName,
                role: role || "user"  
            }
        });

        res.status(201).json(newUser);
    } catch (error) {
        console.error('Error durante el registro:', error);
        res.status(500).json({ error: 'Ocurrió un error durante el registro.' });
    }
});
/*
router.get('/users', async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    try {
        const users = await prisma.user.findMany({
            skip: (page - 1) * limit,
            take: parseInt(limit),
        });

        const totalUsers = await prisma.user.count();

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
*/





router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;


        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(400).json({ error: 'Correo o contraseña inválidos' });
        }


        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Contraseña válida:', isPasswordValid);
        console.log('ingreso:', email);

        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Correo o contraseña inválidos' });
        }


        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, {
            expiresIn: '3h' 
        });

       
        res.json({
            token,
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error durante el login:', error);
        res.status(500).json({ error: 'Ocurrió un error durante el login.' });
    }
});


// Ruta para actualizar parcialmente los datos del usuario
router.patch('/update', async (req, res) => {
    try {
        const { id, email, password, firstName, lastName, role } = req.body;

        // Verificar si el usuario existe
        const user = await prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Preparar los datos a actualizar
        let updatedData = {};

        if (firstName) updatedData.firstName = firstName;
        if (lastName) updatedData.lastName = lastName;
        if (email) updatedData.email = email;
        if (role) updatedData.role = role; // Actualizar el rol si se proporciona

        // Si se proporciona una nueva contraseña, encriptarla
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updatedData.password = hashedPassword;
        }

        // Actualizar el usuario solo con los campos proporcionados
        const updatedUser = await prisma.user.update({
            where: { id },
            data: updatedData,
        });

        res.json(updatedUser);
    } catch (error) {
        console.error('Error durante la actualización del usuario:', error);
        res.status(500).json({ error: 'Ocurrió un error durante la actualización del usuario.' });
    }
});

// Ruta para obtener los datos del usuario logueado
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, SECRET_KEY);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error al obtener el perfil del usuario:', error);
        res.status(500).json({ error: 'Ocurrió un error al obtener los datos del perfil.' });
    }
});




export default router;
