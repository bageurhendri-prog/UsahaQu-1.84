/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UsahaQu v1.83 - Full-Stack Express Server
 * Menyediakan Endpoint API Backend untuk Integrasi Pembayaran Otomatis TriPay:
 * 1. POST /api/create-payment (Pembuatan Transaksi & Signature TriPay)
 * 2. POST /api/tripay-webhook (Callback Notifikasi & Validasi HMAC Signature)
 * 3. GET  /api/payment-status/:reference (Polling Status Pembayaran dari Frontend)
 * 4. POST /api/simulate-payment-success (Sandbox Helper Testing Pembayaran Berhasil)
 * 5. GET  /api/tripay-mock-checkout (Halaman Webview Checkout Simulator TriPay)
 * 
 * Terintegrasi dengan Vite Middleware di mode dev dan Static dist di mode production.
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createTriPayPayment,
  processTriPayWebhook,
  verifyTriPayWebhookSignature,
  getPaymentStatus,
  simulatePaymentSuccess,
  TRIPAY_CONFIG
} from './src/server/tripayService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

interface CustomRequest extends Request {
  rawBody?: Buffer;
}

async function startServer() {
  const app = express();

  // Simpan rawBody untuk validasi HMAC SHA-256 Signature pada Webhook TriPay
  app.use(
    express.json({
      verify: (req: CustomRequest, _res: Response, buf: Buffer) => {
        req.rawBody = buf;
      }
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // CORS Middleware sederhana untuk pengujian API
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization,x-callback-signature,x-callback-event');
    next();
  });

  // =========================================================================
  // 1. ENDPOINT: /api/create-payment
  // =========================================================================
  app.post('/api/create-payment', async (req: Request, res: Response) => {
    try {
      const {
        tenant_id,
        email,
        nama_paket,
        amount,
        payment_method,
        customer_name,
        customer_phone,
        return_url
      } = req.body;

      if (!email || !amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Parameter tenant_id, email, nama_paket, dan amount yang valid wajib diisi.'
        });
      }

      const tx = await createTriPayPayment({
        tenant_id: tenant_id || email,
        email,
        nama_paket: nama_paket || 'Paket Pro UsahaQu',
        amount: Number(amount),
        payment_method: payment_method || 'QRIS',
        customer_name,
        customer_phone,
        return_url
      });

      console.log(`[API /api/create-payment] Transaksi dibuat: Ref ${tx.reference}, ${tx.payment_method}, Rp ${tx.total_amount}`);

      return res.status(200).json({
        success: true,
        message: 'Transaksi TriPay berhasil dibuat',
        data: tx
      });
    } catch (err: any) {
      console.error('[API /api/create-payment Error]:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Gagal memproses pembayaran TriPay.'
      });
    }
  });

  // =========================================================================
  // 2. ENDPOINT: /api/tripay-webhook
  // =========================================================================
  app.post('/api/tripay-webhook', async (req: CustomRequest, res: Response) => {
    try {
      const incomingSignature = (req.headers['x-callback-signature'] || '') as string;
      const callbackEvent = (req.headers['x-callback-event'] || '') as string;

      console.log(`[API /api/tripay-webhook] Event: ${callbackEvent}, Signature: ${incomingSignature ? incomingSignature.substring(0, 10) + '...' : 'none'}`);

      // Validasi HMAC Signature
      const isValid = verifyTriPayWebhookSignature(
        req.rawBody || JSON.stringify(req.body),
        incomingSignature
      );

      if (!isValid) {
        console.warn('[API /api/tripay-webhook] Penolakan: Signature HMAC TriPay tidak valid!');
        return res.status(403).json({
          success: false,
          message: 'Signature TriPay tidak valid.'
        });
      }

      const result = await processTriPayWebhook(req.body);

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('[API /api/tripay-webhook Error]:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Gagal memproses webhook TriPay.'
      });
    }
  });

  // =========================================================================
  // 3. ENDPOINT: /api/payment-status/:reference (Polling status dari Frontend)
  // =========================================================================
  app.get('/api/payment-status/:reference', (req: Request, res: Response) => {
    try {
      const { reference } = req.params;
      const statusData = getPaymentStatus(reference);

      if (!statusData.found || !statusData.transaction) {
        return res.status(404).json({
          success: false,
          message: `Transaksi dengan reference ${reference} tidak ditemukan.`
        });
      }

      return res.status(200).json({
        success: true,
        status: statusData.transaction.status,
        data: statusData.transaction,
        license: statusData.license
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Gagal mengambil status pembayaran.'
      });
    }
  });

  // =========================================================================
  // 4. ENDPOINT: /api/simulate-payment-success (Simulator Sandbox Testing)
  // =========================================================================
  app.post('/api/simulate-payment-success', async (req: Request, res: Response) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({
          success: false,
          message: 'Parameter reference wajib disertakan.'
        });
      }

      const result = await simulatePaymentSuccess(reference);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Gagal mensimulasikan pembayaran sukses.'
      });
    }
  });

  // =========================================================================
  // 5. ENDPOINT: /api/tripay-mock-checkout (Webview Simulator Halaman TriPay)
  // =========================================================================
  app.get('/api/tripay-mock-checkout', (req: Request, res: Response) => {
    const ref = (req.query.ref || '') as string;
    const txData = getPaymentStatus(ref);

    if (!txData.found || !txData.transaction) {
      return res.send(`
        <div style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2>Transaksi Tidak Ditemukan</h2>
          <p>Reference: ${ref || '-'}</p>
        </div>
      `);
    }

    const tx = txData.transaction;

    res.send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TriPay Payment Simulator • UsahaQu v1.83</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
        <div class="bg-white max-w-md w-full rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div class="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex items-center justify-between">
            <div>
              <span class="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                TriPay Payment Gateway
              </span>
              <h1 class="text-lg font-black mt-1">UsahaQu Billing</h1>
            </div>
            <div class="text-right">
              <span class="text-xs text-blue-200">Total Tagihan</span>
              <p class="text-lg font-black text-amber-300">Rp ${tx.total_amount.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div class="p-6 space-y-4">
            <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div class="flex justify-between text-slate-500">
                <span>No. Referensi:</span>
                <span class="font-mono font-bold text-slate-800">${tx.reference}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Paket Upgrade:</span>
                <span class="font-bold text-slate-800">${tx.nama_paket}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Metode Bayar:</span>
                <span class="font-bold text-indigo-700">${tx.payment_name}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Pelanggan:</span>
                <span class="font-bold text-slate-800">${tx.customer_email}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>Status Saat Ini:</span>
                <span id="badge-status" class="px-2 py-0.5 rounded font-black ${tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                  ${tx.status}
                </span>
              </div>
            </div>

            ${tx.payment_method === 'QRIS' && tx.qr_url ? `
              <div class="text-center p-4 bg-white border border-slate-200 rounded-2xl">
                <p class="text-xs font-bold text-slate-700 mb-2">Scan QRIS Menggunakan BCA, GoPay, OVO, Dana, atau ShopeePay</p>
                <img src="${tx.qr_url}" alt="QRIS Code" class="w-48 h-48 mx-auto rounded-xl shadow-inner border border-slate-100" />
                <p class="text-[10px] text-slate-400 mt-2">NMID: ID102003849102 • UsahaQu POS</p>
              </div>
            ` : `
              <div class="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl text-center">
                <span class="text-xs text-indigo-700 font-bold">Nomor Virtual Account (${tx.payment_method}):</span>
                <div class="text-xl font-mono font-black text-indigo-950 mt-1 select-all tracking-wider">
                  ${tx.pay_code || '88012081234567'}
                </div>
                <p class="text-[11px] text-slate-500 mt-1">Salin nomor VA dan bayar via ATM / Mobile Banking</p>
              </div>
            `}

            <div class="pt-2 space-y-2">
              <button 
                id="btn-simulate-pay"
                onclick="simulatePay()" 
                class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Simulasikan Bayar Lunas (Testing)</span>
                <span>&rarr;</span>
              </button>

              <p class="text-[10px] text-center text-slate-400 leading-relaxed">
                Mode Simulator TriPay UsahaQu v1.83. Begitu Anda mengklik tombol di atas, webhook akan dipanggil otomatis dan lisensi Anda diaktifkan 100%.
              </p>
            </div>
          </div>
        </div>

        <script>
          async function simulatePay() {
            const btn = document.getElementById('btn-simulate-pay');
            btn.disabled = true;
            btn.innerText = 'Memverifikasi Pembayaran...';

            try {
              const res = await fetch('/api/simulate-payment-success', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: '${tx.reference}' })
              });
              const json = await res.json();
              if (json.success) {
                document.getElementById('badge-status').className = 'px-2 py-0.5 rounded font-black bg-emerald-100 text-emerald-800';
                document.getElementById('badge-status').innerText = 'PAID';
                btn.className = 'w-full py-3 bg-emerald-800 text-white font-black text-sm rounded-xl';
                btn.innerText = 'Pembayaran Berhasil Diverifikasi!';
                setTimeout(() => {
                  window.close();
                }, 1500);
              } else {
                alert('Gagal: ' + json.message);
                btn.disabled = false;
                btn.innerText = 'Coba Lagi';
              }
            } catch (err) {
              alert('Error: ' + err.message);
              btn.disabled = false;
            }
          }
        </script>
      </body>
      </html>
    `);
  });

  // =========================================================================
  // INTEGRASI VITE MIDDLEWARE (DEV) ATAU STATIC (PROD)
  // =========================================================================
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('[UsahaQu Server] Vite Dev Server Middleware mounted on port', PORT);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[UsahaQu Server] Production Static Files mounted from dist/');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [UsahaQu v1.83] Server berjalan di http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[UsahaQu Server Fatal Error]:', err);
});
