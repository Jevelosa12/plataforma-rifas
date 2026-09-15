import Link from 'next/link';

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto p-8 text-center font-sans mt-10">
      <h1 className="text-4xl font-bold text-blue-900 mb-4">Plataforma de Rifas</h1>
      <p className="text-gray-600 mb-8">
        Crea tus propias rifas de forma gratuita, comparte tu QR de pago y administra tus sorteos fácilmente.
      </p>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Link 
          href="/crear" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow transition-all"
        >
          Crear una Rifa Gratis
        </Link>
      </div>
    </main>
  );
}