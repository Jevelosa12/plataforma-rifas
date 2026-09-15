import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient'; // Asegúrate que la ruta a tu archivo supabaseClient sea correcta

export default function RifaView({ raffleId }) {
  const [raffle, setRaffle] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1. Cargar datos de la rifa y boletos al iniciar
  useEffect(() => {
    fetchRaffleData();

    // Suscripción en tiempo real: si alguien más compra un número, la cuadrícula se actualiza sola
    const channel = supabase
      .channel('public:tickets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `raffle_id=eq.${raffleId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTickets((prev) =>
              prev.map((t) => (t.id === payload.new.id ? payload.new : t))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raffleId]);

  async function fetchRaffleData() {
    // Obtener información de la rifa
    const { data: raffleData, error: raffleError } = await supabase
      .from('raffles')
      .select('*')
      .eq('id', raffleId)
      .single();

    if (raffleError) console.error('Error al cargar rifa:', raffleError);
    else setRaffle(raffleData);

    // Obtener todos los boletos de esta rifa
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('raffle_id', raffleId)
      .order('ticket_number', { ascending: true });

    if (ticketsError) console.error('Error al cargar boletos:', ticketsError);
    else setTickets(ticketsData || []);
  }

  // 2. Función al hacer clic en un número libre (Reserva temporal)
  async function handleSelectTicket(ticket) {
    if (ticket.status !== 'available') return;

    const { data, error } = await supabase
      .from('tickets')
      .update({
        status: 'reserved',
        reserved_at: new Date().toISOString(),
      })
      .eq('id', ticket.id)
      .eq('status', 'available') // Garantiza que nadie más lo haya tomado en el mismo milisegundo
      .select();

    if (error || !data || data.length === 0) {
      alert('¡Lo siento! Este número acaba de ser seleccionado por otro usuario.');
      fetchRaffleData(); // Refrescar cuadrícula
      setSelectedTicket(null);
      return;
    }

    setSelectedTicket(data[0]);
  }

  // 3. Función para enviar el comprobante de pago
  async function handleSubmitPayment(e) {
    e.preventDefault();
    if (!file || !buyerName || !buyerPhone) {
      alert('Por favor completa tu nombre, teléfono y sube la foto del comprobante.');
      return;
    }

    setLoading(true);

    try {
      // A. Subir la imagen del comprobante a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedTicket.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // B. Obtener la URL pública de la imagen subida
      const { data: urlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // C. Actualizar el boleto con los datos del comprador y la foto (queda en estado 'reserved' esperando aprobación del creador)
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          payment_proof_url: publicUrl,
        })
        .eq('id', selectedTicket.id);

      if (updateError) throw updateError;

      alert('¡Comprobante enviado con éxito! El creador verificará tu pago y aprobará tu número pronto.');
      setSelectedTicket(null);
      setFile(null);
      setBuyerName('');
      setBuyerPhone('');
      fetchRaffleData();
    } catch (error) {
      console.error('Error al enviar pago:', error);
      alert('Hubo un error al subir el comprobante. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (!raffle) return <div className="text-center p-10">Cargando rifa...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 font-sans">
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{raffle.title}</h1>
        <p className="text-gray-600 mt-1">{raffle.description}</p>
        <div className="mt-4 bg-blue-50 p-4 rounded-md border border-blue-200">
          <p className="text-lg font-semibold text-blue-900">Premio: {raffle.prize}</p>
          <p className="text-md text-blue-700">Valor por boleto: ${raffle.ticket_price}</p>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="flex gap-4 mb-4 text-sm justify-center items-center">
        <div className="flex items-center gap-1"><span className="w-4 h-4 bg-green-200 inline-block rounded"></span> Disponible</div>
        <div className="flex items-center gap-1"><span className="w-4 h-4 bg-yellow-300 inline-block rounded"></span> Seleccionado/Reservado</div>
        <div className="flex items-center gap-1"><span className="w-4 h-4 bg-red-300 inline-block rounded"></span> Vendido / Pagado</div>
      </div>

      {/* Cuadrícula de Números */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="font-bold text-lg mb-3 text-gray-700">Selecciona tu número:</h3>
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-72 overflow-y-auto p-2 border rounded-md">
          {tickets.map((ticket) => {
            let bgColor = 'bg-green-100 hover:bg-green-200 text-green-800';
            if (ticket.status === 'reserved') bgColor = 'bg-yellow-200 text-yellow-800 cursor-not-allowed';
            if (ticket.status === 'paid') bgColor = 'bg-red-200 text-red-800 cursor-not-allowed opacity-60';
            if (selectedTicket?.id === ticket.id) bgColor = 'bg-blue-600 text-white';

            return (
              <button
                key={ticket.id}
                onClick={() => handleSelectTicket(ticket)}
                disabled={ticket.status !== 'available'}
                className={`py-2 rounded font-bold text-center transition-all ${bgColor}`}
              >
                {ticket.ticket_number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel de Pago (Se muestra cuando el usuario selecciona un número) */}
      {selectedTicket && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-6 shadow-md">
          <h3 className="text-xl font-bold text-amber-900 mb-2">
            Has seleccionado el número: <span className="text-blue-600">#{selectedTicket.ticket_number}</span>
          </h3>
          <p className="text-gray-700 mb-4">Escanea el código QR del organizador para realizar tu pago:</p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <img
              src={raffle.qr_image_url}
              alt="QR de Pago"
              className="w-48 h-48 object-contain border bg-white p-2 rounded shadow"
            />
            <div className="text-gray-700 flex-1">
              <p className="font-semibold mb-1">Instrucciones:</p>
              <p className="text-sm bg-white p-3 rounded border mb-4">{raffle.payment_instructions || 'Realiza la transferencia por el valor exacto del boleto al QR indicado.'}</p>
            </div>
          </div>

          <form onSubmit={handleSubmitPayment} className="mt-6 flex flex-col gap-4 border-t pt-4">
            <h4 className="font-bold text-gray-800">Sube tu comprobante de pago:</h4>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tu Nombre Completo</label>
              <input
                type="text"
                required
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Ej. Carlos Pérez"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tu Teléfono / WhatsApp</label>
              <input
                type="text"
                required
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="Ej. 3101234567"
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Captura del Comprobante (Foto o Imagen)</label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full border p-2 rounded bg-white text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow transition-all"
            >
              {loading ? 'Subiendo comprobante...' : 'Enviar Comprobante de Pago'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}