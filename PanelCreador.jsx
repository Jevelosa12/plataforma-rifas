import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient'; // Asegúrate que la ruta a tu archivo supabaseClient sea correcta

export default function PanelCreador({ userId }) {
  const [raffles, setRaffles] = useState([]);
  const [selectedRaffle, setSelectedRaffle] = useState(null);
  const [ticketsToReview, setTicketsToReview] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Cargar las rifas creadas por este usuario
  useEffect(() => {
    if (userId) fetchRaffles();
  }, [userId]);

  async function fetchRaffles() {
    const { data, error } = await supabase
      .from('raffles')
      .select('*')
      .eq('user_id', userId);

    if (error) console.error('Error al cargar rifas:', error);
    else setRaffles(data || []);
  }

  // 2. Cargar los boletos reservados o pendientes de aprobación de una rifa seleccionada
  async function handleSelectRaffle(raffle) {
    setSelectedRaffle(raffle);
    fetchPendingTickets(raffle.id);
  }

  async function fetchPendingTickets(raffleId) {
    setLoading(true);
    // Traemos los boletos que están en estado 'reserved' (esperando revisión) o 'paid'
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('raffle_id', raffleId)
      .in('status', ['reserved', 'paid'])
      .order('updated_at', { ascending: false });

    if (error) console.error('Error al cargar boletos:', error);
    else setTicketsToReview(data || []);
    setLoading(false);
  }

  // 3. Función para que el creador APRUEBE el pago
  async function handleApproveTicket(ticketId) {
    const confirmacion = window.confirm('¿Estás seguro de aprobar este pago? El número quedará registrado como VENDIDO.');
    if (!confirmacion) return;

    const { error } = await supabase
      .from('tickets')
      .update({ status: 'paid' })
      .eq('id', ticketId);

    if (error) {
      alert('Hubo un error al aprobar el boleto.');
      console.error(error);
    } else {
      alert('¡Boleto aprobado con éxito!');
      fetchPendingTickets(selectedRaffle.id); // Refrescar lista
    }
  }

  // 4. Función para RECHAZAR el pago (libera el número de nuevo)
  async function handleRejectTicket(ticketId) {
    const confirmacion = window.confirm('¿Rechazar este pago? El número volverá a quedar DISPONIBLE para otros compradores.');
    if (!confirmacion) return;

    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'available',
        buyer_name: null,
        buyer_phone: null,
        payment_proof_url: null,
        reserved_at: null
      })
      .eq('id', ticketId);

    if (error) {
      alert('Hubo un error al rechazar el boleto.');
      console.error(error);
    } else {
      alert('El boleto ha sido liberado.');
      fetchPendingTickets(selectedRaffle.id); // Refrescar lista
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Panel de Control del Creador</h1>

      {/* Si no ha seleccionado ninguna rifa, mostrar lista de sus rifas */}
      {!selectedRaffle ? (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Tus Rifas Activas</h2>
          {raffles.length === 0 ? (
            <p className="text-gray-500">No tienes rifas creadas todavía.</p>
          ) : (
            <div className="grid gap-4">
              {raffles.map((raffle) => (
                <div key={raffle.id} className="border p-4 rounded-md flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-blue-900">{raffle.title}</h3>
                    <p className="text-sm text-gray-600">Premio: {raffle.prize} | Valor: ${raffle.ticket_price}</p>
                  </div>
                  <button
                    onClick={() => handleSelectRaffle(raffle)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold"
                  >
                    Gestionar Pagos y Números
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Si seleccionó una rifa, mostrar la gestión de pagos */
        <div className="bg-white shadow-md rounded-lg p-6">
          <button
            onClick={() => setSelectedRaffle(null)}
            className="text-blue-600 font-semibold mb-4 inline-block hover:underline"
          >
            ← Volver a mis rifas
          </button>
          
          <h2 className="text-xl font-bold text-gray-800 mb-1">Rifa: {selectedRaffle.title}</h2>
          <p className="text-sm text-gray-500 mb-6">Revisa los comprobantes enviados por los compradores y aprueba los pagos.</p>

          {loading ? (
            <p>Cargando transacciones...</p>
          ) : ticketsToReview.length === 0 ? (
            <div className="bg-gray-50 p-8 text-center rounded border text-gray-500">
              No hay pagos pendientes por revisar en este momento.
            </div>
          ) : (
            <div className="grid gap-6">
              {ticketsToReview.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start bg-gray-50">
                  {/* Comprobante de pago (Imagen) */}
                  <div className="w-full md:w-48 h-48 bg-white border rounded overflow-hidden flex items-center justify-center">
                    {ticket.payment_proof_url ? (
                      <a href={ticket.payment_proof_url} target="_blank" rel="noopener noreferrer">
                        <img 
                          src={ticket.payment_proof_url} 
                          alt="Comprobante" 
                          className="w-full h-48 object-cover hover:scale-105 transition-transform" 
                          title="Haz clic para ampliar"
                        />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Sin comprobante</span>
                    )}
                  </div>

                  {/* Datos del comprador */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded">
                        Número #{ticket.ticket_number}
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${ticket.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {ticket.status === 'paid' ? 'PAGADO Y APROBADO' : 'PENDIENTE DE REVISIÓN'}
                      </span>
                    </div>

                    <p className="text-gray-700"><strong>Comprador:</strong> {ticket.buyer_name || 'No especificado'}</p>
                    <p className="text-gray-700"><strong>Teléfono / WhatsApp:</strong> {ticket.buyer_phone || 'No especificado'}</p>
                    <p className="text-xs text-gray-400 mt-2">Reservado el: {new Date(ticket.reserved_at).toLocaleString()}</p>

                    {/* Botones de acción */}
                    {ticket.status === 'reserved' && (
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => handleApproveTicket(ticket.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold shadow"
                        >
                          Aprobar Pago
                        </button>
                        <button
                          onClick={() => handleRejectTicket(ticket.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-bold shadow"
                        >
                          Rechazar y Liberar Número
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}