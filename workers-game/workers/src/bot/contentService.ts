import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

// We need to load WASM for resvg. In CF Workers, we usually import it.
// However, the specific import depends on the bundler. 
// For now we assume typical ES module behaviour or that the user has configured it.
// If this fails, we might need a specific rollup plugin or copy step.

// Simplified font loader
async function loadFont() {
    try {
        // Try fetching Google Font
        const response = await fetch('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2');
        if (!response.ok) throw new Error('Font fetch failed');
        return await response.arrayBuffer();
    } catch (e) {
        console.warn('Font load failed, using fallback or system font');
        return null; // Satori might default or we can provide a minimal filtered buffer
    }
}

export class ContentService {

    private static async renderSvgToPng(svg: string): Promise<Uint8Array> {
        // Initialize WASM blindly
        try {
            // specific import for cloudflare workers environment might differ
            // @ts-ignore
            await initWasm(import('@resvg/resvg-wasm/index_bg.wasm').then(m => m.default));
        } catch (e) {
            console.log('WASM init skipped or failed (might be already loaded)', e);
        }

        const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 800 } });
        const pngData = resvg.render();
        return pngData.asPng();
    }

    static async generateWinnerCard(name: string, amount: string, currency: string = 'ETB'): Promise<Uint8Array> {
        const fontData = await loadFont();
        const svg = await satori(
            {
                type: 'div',
                props: {
                    style: {
                        display: 'flex',
                        height: '100%',
                        width: '100%',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundImage: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
                        color: 'white',
                    },
                    children: [
                        {
                            type: 'div',
                            props: {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '24px',
                                    padding: '40px 60px',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                },
                                children: [
                                    { type: 'div', props: { children: '🏆 WINNER 🏆', style: { fontSize: '24px', marginBottom: '10px', letterSpacing: '4px', opacity: 0.9, textTransform: 'uppercase' } } },
                                    { type: 'h1', props: { children: name, style: { fontSize: '56px', margin: '0 0 20px 0', fontWeight: 'bold' } } },
                                    {
                                        type: 'div',
                                        props: {
                                            children: `${amount} ${currency}`,
                                            style: {
                                                fontSize: '72px',
                                                fontWeight: '900',
                                                background: 'linear-gradient(to bottom, #fcd34d, #d97706)',
                                                backgroundClip: 'text',
                                                color: 'transparent',
                                                marginBottom: '10px'
                                            }
                                        }
                                    },
                                    { type: 'div', props: { children: 'Bingo Ethiopia', style: { fontSize: '14px', marginTop: '20px', opacity: 0.6 } } }
                                ]
                            }
                        }
                    ]
                },
            },
            {
                width: 800,
                height: 500,
                fonts: fontData ? [{ name: 'Roboto', data: fontData, weight: 700, style: 'normal' }] : [],
            }
        );
        return this.renderSvgToPng(svg);
    }

    static async generateJackpotCard(amount: string): Promise<Uint8Array> {
        const fontData = await loadFont();
        const svg = await satori(
            {
                type: 'div',
                props: {
                    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundImage: 'radial-gradient(circle at center, #991b1b, #000)', color: 'white' },
                    children: [
                        { type: 'div', props: { children: '🚨 BIG DERASH ALERT 🚨', style: { fontSize: '32px', fontWeight: 'bold', color: '#fca5a5', marginBottom: '20px', textTransform: 'uppercase' } } },
                        { type: 'div', props: { children: 'JACKPOT HIT', style: { fontSize: '80px', fontWeight: '900', color: '#fff', textShadow: '0 0 20px #ef4444' } } },
                        { type: 'div', props: { children: `${amount} ETB`, style: { fontSize: '64px', marginTop: '20px', padding: '10px 40px', backgroundColor: '#fff', color: '#b91c1c', borderRadius: '100px', fontWeight: 'bold' } } }
                    ]
                }
            },
            { width: 800, height: 600, fonts: fontData ? [{ name: 'Roboto', data: fontData, weight: 700, style: 'normal' }] : [] }
        );
        return this.renderSvgToPng(svg);
    }

    static async generateMilestoneCard(count: string, label: string): Promise<Uint8Array> {
        const fontData = await loadFont();
        const svg = await satori(
            {
                type: 'div',
                props: {
                    style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: '#0f172a', backgroundImage: 'linear-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '40px 40px', color: 'white' },
                    children: [
                        { type: 'div', props: { children: 'MILESTONE UNLOCKED 🔓', style: { fontSize: '24px', color: '#2dd4bf', marginBottom: '40px', letterSpacing: '2px' } } },
                        { type: 'div', props: { children: count, style: { fontSize: '120px', fontWeight: '900', lineHeight: 1, background: 'linear-gradient(to right, #2dd4bf, #3b82f6)', backgroundClip: 'text', color: 'transparent' } } },
                        { type: 'div', props: { children: label, style: { fontSize: '40px', marginTop: '10px', fontWeight: 'bold', color: '#94a3b8' } } }
                    ]
                }
            },
            { width: 800, height: 600, fonts: fontData ? [{ name: 'Roboto', data: fontData, weight: 700, style: 'normal' }] : [] }
        );
        return this.renderSvgToPng(svg);
    }
}
