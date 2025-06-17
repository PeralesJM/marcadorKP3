# Usa una imagen oficial de Node.js como base
FROM node:18

# Crea directorio de trabajo
WORKDIR /app

# Copia solo los archivos de dependencias para instalarlas primero (cache optimizada)
COPY package*.json ./

# Instala dependencias
RUN npm install

# Copia el resto del código del proyecto
COPY . .

# Expone el puerto (ajusta si usas otro)
EXPOSE 3001

# Usa variables de entorno en tiempo de ejecución
ENV NODE_ENV=production

# Comando para iniciar el servidor
CMD ["node", "server.js"]
