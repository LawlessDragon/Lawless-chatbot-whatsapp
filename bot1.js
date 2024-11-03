// imports 
const { Client, LocalAuth } = require('whatsapp-web.js'); // Pastikan LocalAuth diimpor
const qrcode = require('qrcode-terminal');
const { consola } = require("consola");
const axios = require('axios');

// new whatsapp client with LocalAuth for session management
const client = new Client({
    authStrategy: new LocalAuth() // Use LocalAuth for automatic session management
});

// Generate QR code only if session is missing
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    consola.start('Waiting for login....\n');
    consola.info(`QR Code At: https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}`);
});

// Log when client is ready
client.on('ready', () => {
    consola.success('\nClient is ready!\n');
});

// Handle client disconnection by reinitializing to prompt QR again if needed
client.on('disconnected', () => {
    consola.warn('Client disconnected. Reinitializing...');
    client.initialize(); // Re-initialize client to prompt QR code on next connection attempt
});

// Handles Commands 
client.on("message_create", async (msg) => handler(msg));

/**
 * ALL Commands Handler
 */
async function handler(msg) {
    if (msg.body.startsWith(".")) { // Trigger menggunakan titik
        await cmdAsk(msg);
    }
}

/**
 * Function to get response from Gemini
 */
async function getGeminiResponse(prompt) {
    if (!prompt) {
        return "Gak ada perintah yang diberikan.";
    }

    const conversationalPrompt = `Pernalkan dirimu hanya satu kali aja ya di awal sisanya tidak usah "Hai aku Lawless si naga biru." Bicaralah layaknya teman ngobrol tapi sedikit menjiwai naga nya , sedikit bercanda tapi ada kalanya tetap informatif. Karaktermu ramah dan tidak sombong, siap bantu cari info atau jawaban yang dibutuhkan dengan jelas, tanpa lebay. Jika perlu, lakukan pencarian untuk memberikan informasi terbaru.
: ${prompt}`;

    const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyD2JTY0nxLyyHbjH2gdSYXPYXZvx44Y3Fo"; // Ganti dengan API Key Gemini Anda

    const payload = { contents: [{ parts: [{ text: conversationalPrompt }] }] };

    try {
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Periksa apakah response.data.candidates dan bagian-bagiannya ada
        if (response.data.candidates && response.data.candidates.length > 0 &&
            response.data.candidates[0].content && 
            response.data.candidates[0].content.parts && 
            response.data.candidates[0].content.parts.length > 0) {
            
            const chatResponse = response.data.candidates[0].content.parts[0].text;
            return chatResponse;
        } else {
            return "Tidak ada respons yang diterima dari Gemini.";
        }
    } catch (error) {
        console.error("Error:", error.message);
        return "Terjadi kesalahan saat menghubungi Gemini.";
    }
}

/**
 * Handles command triggered by dot (.)
 */
async function cmdAsk(msg) {
    const content = msg.body.replace(".", "").trim(); // Ambil isi pertanyaan setelah titik
    try {
        const response = await getGeminiResponse(content); // Panggil fungsi getGeminiResponse
        consola.box(`:User    +${msg.from.toString().split("@")[0]}\nMessage: ${content}\nReply: ${response}`);
        await msg.reply(response); // Kirim balasan ke pengguna
    } catch (e) {
        await msg.reply(`🛑 *ERROR*: ${e.message}`);
        consola.error(e.message);
    }
}

/**
 * Error Handler
 */
process.on('unhandledRejection', e => {
    consola.error(e);
});

// init client 
client.initialize();
module.exports = client;