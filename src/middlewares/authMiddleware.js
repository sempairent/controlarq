// middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'valentinedos';

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token.' });
    }

    const token = authHeader.split(' ')[1]; // Obtener el token del encabezado

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Formato de token inválido.' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY); // Verificar y decodificar el token
        req.user = decoded; // Almacenar la información decodificada del usuario en la solicitud
        next(); // Continuar con la siguiente función de middleware o ruta
    } catch (error) {
        return res.status(403).json({ error: 'Acceso denegado. Token inválido.' });
    }
};
