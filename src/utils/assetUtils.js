/**
 * Centralized logic for generating BFG Standee assets.
 * This ensures visual consistency across Admin and Merchant portals.
 */

export const STANDER_CONFIG = {
    cWidth: 1118,
    cHeight: 1588,
    bgBlue: '#011536',
    accentYellow: '#ffcc00',
    white: '#ffffff',
    cardSize: 650,
    qrSize: 550
};

export const drawStandee = (mainCanvas, qrCanvas, bizName) => {
    const ctx = mainCanvas.getContext('2d');
    const { cWidth, cHeight, bgBlue, accentYellow, white, cardSize } = STANDER_CONFIG;
    
    // 1. Background
    ctx.fillStyle = bgBlue;
    ctx.fillRect(0, 0, cWidth, cHeight);

    // 2. Header Branding
    ctx.textAlign = 'right';
    ctx.fillStyle = accentYellow;
    ctx.font = 'bold 45px sans-serif';
    ctx.fillText('theBFG.team', cWidth - 60, 110);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Conviction Network', cWidth - 60, 145);

    // 3. Support Text
    ctx.textAlign = 'center';
    ctx.fillStyle = white;
    ctx.font = 'bold 90px sans-serif';
    ctx.fillText('SUPPORT', cWidth / 2, 350);
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText('FOR-GOOD BUSINESSES', cWidth / 2, 430);

    // 4. White QR Card Card
    const cardX = (cWidth - cardSize) / 2;
    const cardY = 550;
    ctx.fillStyle = white;
    ctx.beginPath();
    // Path for rounded rect if supported, else rect
    if (ctx.roundRect) {
        ctx.roundRect(cardX, cardY, cardSize, cardSize, 30);
    } else {
        ctx.rect(cardX, cardY, cardSize, cardSize);
    }
    ctx.fill();

    // 5. Draw QR Code from the provided canvas
    if (qrCanvas) {
        const padding = (cardSize - 550) / 2;
        ctx.drawImage(qrCanvas, cardX + padding, cardY + padding, 550, 550);
    }

    // 6. Business Name Footer
    ctx.fillStyle = white;
    ctx.font = 'bold 70px sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(bizName.toUpperCase(), cWidth / 2, 1400);

    // 7. Success!
    return mainCanvas.toDataURL('image/png');
};
