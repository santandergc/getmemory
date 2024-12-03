import dotenv from 'dotenv';
// Elimina dotenv del caché de require
delete require.cache[require.resolve('dotenv')];

// Vuelve a cargar dotenv
require('dotenv').config();
