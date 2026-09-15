import { useState } from 'react';
import { supabase } from './supabaseClient'; // Asegúrate que la ruta a tu archivo supabaseClient sea correcta

export default function CrearRifa({ userId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prize, setPrize] = useState('');
  const [totalNumbers, setTotalNumbers] = useState(100); // Por defecto 100 números
  const [ticketPrice, setTicketPrice] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCreateRaffle(e) {
    e.preventDefault();

    if (!userId) {
      alert('Debes iniciar sesión para crear una rifa.');
      return;
    }

    if (!qrFile) {
      alert('Por favor selecciona la imagen del código QR de pago.');
      return;
    }

    setLoading(true);

    try {
      // 1. Subir la imagen del QR del creador a Supabase Storage (usando el bucket 'comprobantes' o uno propio)
      const fileExt = qrFile.name.split('.').pop();
      const fileName = `qr-${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprobantes') // Usamos el mismo bucket que creamos antes
        .upload(filePath, qrFile);

      if (uploadError) throw uploadError;

      // 2. Obtener la URL pública de la imagen del QR
      const { data: urlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(filePath);

      const qrPublicUrl = urlData.publicUrl;

      // 3. Insertar la nueva rifa en la tabla 'raffles'
      // (Al insertarla, la base de datos genera automáticamente todos los números gracias al disparador SQL que creamos)
      const { error: insertError } = await supabase
        .from('raffles')
        .insert([
          {
            user_id: userId,
            title: title,
            description: description,
            prize: prize,
            total_numbers: parseInt(totalNumbers),
            ticket_price: parseFloat(ticketPrice),
            qr_image_url: qrPublicUrl,
            payment_instructions: paymentInstructions,
            draw_date: new Date(drawDate).toISOString(),
            status: 'active'
          }
        ]);

      if (insertError) throw insertError;

      alert('¡Rifa creada con éxito! Los números se han generado automáticamente.');
      
      // Limpiar formulario
      setTitle('');
      setDescription('');
      setPrize('');
      setTotalNumbers(100);
      setTicketPrice('');
      setPaymentInstructions('');
      setDrawDate('');
      setQrFile(null);

    } catch (error) {
      console.error('Error al crear la rifa:', error);
      alert('Hubo un error al crear la rifa. Revisa los datos e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg font-sans">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Crear Nueva Rifa</h2>

      <form onSubmit={handleCreateRaffle} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Título de la Rifa</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Gran Rifa Moto Yamaha FZ"
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción corta</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles del evento o motivo de la rifa..."
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
            rows="2"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">¿Qué se rifa? (Premio)</label>
          <input
            type="text"
            required
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            placeholder="Ej. Moto Yamaha FZ modelo 2024 cero kilómetros"
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Cantidad de Números</label>
            <select
              value={totalNumbers}
              onChange={(e) => setTotalNumbers(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="100">100 números (00 al 99)</option>
              <option value="500">500 números (000 al 499)</option>
              <option value="1000">1000 números (000 al 999)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Los números se generan solos desde el 0.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Precio por Boleto ($)</label>
            <input
              type="number"
              required
              min="1"
              value={ticketPrice}
              onChange={(e) => setTicketPrice(e.target.value)}
              placeholder="Ej. 10000"
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha y Hora del Sorteo</label>
          <input
            type="datetime-local"
            required
            value={drawDate}
            onChange={(e) => setDrawDate(e.target.value)}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Carga del QR del creador */}
        <div className="border-t pt-4 mt-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Sube la imagen de tu Código QR de Pago</label>
          <p className="text-xs text-gray-500 mb-2">Este QR aparecerá en pantalla cuando alguien quiera comprar un boleto para que te transfiera directamente.</p>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setQrFile(e.target.files[0])}
            className="w-full border p-2 rounded bg-gray-50 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Instrucciones de Pago</label>
          <textarea
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
            placeholder="Ej. Transferir a Nequi 3101234567 a nombre de Juan Pérez y enviar captura..."
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
            rows="2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition-all mt-4"
        >
          {loading ? 'Creando rifa y generando números...' : 'Publicar Rifa Gratis'}
        </button>
      </form>
    </div>
  );
}