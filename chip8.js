var c = document.getElementById("canvas");
var ctx = c.getContext("2d");
c.width = 64;
c.height = 32;

class CHIP8 {
    framebuffer = ctx.createImageData(c.width, c.height);
    constructor() {
        this.keyboard = new Array(16);
        this.mem = new Uint8Array(4096);
        this.V = new Uint8Array(16); // Registers
        this.S = new Uint16Array(16); // Stack
        this.ST = 0;
        this.DT = 0;
        this.I = 0;
        this.SP = 0;
        this.PC = 0x200;
        this.OC = 0x0000;
        this.drawFlag = false;
        this.running = true;
    }

    updateDebug() {
        let v_div = document.getElementById("v");
        let s_div = document.getElementById("s");
        let i_div = document.getElementById("indexes");

        let indexes = [this.PC, this.SP, this.I];

        let vHTML = '';
        let sHTML = '';
        let iHTML = '';

        this.V.forEach(element => { vHTML += '<p>' + element.toString(16) + '</p>'; });
        this.S.forEach(element => { sHTML += '<p>' + element.toString(16) + '</p>'; });
        indexes.forEach(element => { iHTML += '<p>' + element.toString(16) + '</p>'; });


        v_div.innerHTML = vHTML;
        i_div.innerHTML = iHTML;
        s_div.innerHTML = sHTML;
    }

    drawPixel(index, color) {
        // color #FF FF FF
        this.framebuffer.data[index] = (color >> 8) & 0xFF;
        this.framebuffer.data[index + 1] = (color >> 4) & 0xFF;
        this.framebuffer.data[index + 2] = color & 0xFF;
        this.framebuffer.data[index + 3] = 0xFF;
    }

    init() {
        // clear canvas
        for (let i = 0, length = (32 * 64) * 4; i < length; i += 4) {
            this.drawPixel(i, 0x000000);
        }
        ctx.putImageData(this.framebuffer, 0, 0);
    }

    handleKeys(){
        this.keyboard
    }

    reset() {
        this.running = true;
        this.mem.fill(0);
        this.V.fill(0);
        this.S.fill(0);
        this.ST = 0;
        this.DT = 0;
        this.I = 0;
        this.SP = 0;
        this.PC = 0x200;
        this.OC = 0x0000;

        this.init();
    }

    step() {
        this.cycle();
        this.updateDebug();
    }

    run() {
        if (this.running) this.cycle();
        setTimeout(this.run.bind(this), 1);
    }

    cycle() {
        this.OC = (this.mem[this.PC++] << 8 | this.mem[this.PC++]);
        let nnn = this.OC & 0x0FFF;
        let n = this.OC & 0xF;
        let x = (this.OC >> 8) & 0x0F;
        let y =  (this.OC >> 4) & 0x0F;
        let kk = this.OC & 0xFF;

        switch (this.OC >> 12) {
            case 0x0:
                switch (this.OC & 0x00FF) {
                    case 0x00E0:
                        for (let i = 0, lenght = this.framebuffer.data.length; i < lenght; i += 4) {
                            this.framebuffer.data[i] = 0x00;
                            this.framebuffer.data[i + 1] = 0x00;
                            this.framebuffer.data[i + 2] = 0x00;
                            this.framebuffer.data[i + 3] = 0xFF;
                        }
                        ctx.putImageData(this.framebuffer, 0, 0);
                        break; // CLS
                    case 0x00EE: this.PC = this.S[this.SP--]; break;
                    default: console.log("Instruction not implemented: ", this.OC); this.running = false; break;
                }
                break;
            case 0x1: this.PC = nnn; break;
            case 0x2: this.S[++this.SP] = this.PC; this.PC = nnn; break;
            case 0x3: if (this.V[x] === kk) this.PC += 2; break;
            case 0x4: if (this.V[x] !== kk) this.PC += 2; break;
            case 0x6: this.V[x] = kk; break; // LD vx, byte
            case 0x7: this.V[x] = this.V[x] + kk; break;
            case 0x8:
                switch (n) {
                    case 0x0: this.V[x] = this.V[y]; break;
                    case 0x1: this.V[x] = this.V[x] | this.V[y]; break;
                    case 0x2: this.V[x] = this.V[x] & this.V[y]; break;
                    case 0x3: this.V[x] = this.V[x] ^ this.V[y]; break;
                    case 0x4:
                        let sum = (this.V[x] + this.V[y]);
                        this.V[x] = sum & 0xFF;
                        if (sum > 0xFF) this.V[0xF] = 1;
                        break;
                    case 0x5:
                        this.V[0xF] = (this.V[x] > this.V[y]) ? 1 : 0;
                        this.V[x] = this.V[x] - this.V[y];
                        break;
                    case 0x6:
                        this.V[0xF] = this.V[x] & 0x1;
                        this.V[x] = this.V[x] / 2;
                        break;
                    case 0x7:
                        this.V[0xF] = (this.V[y] > this.V[x]) ? 1 : 0;
                        this.V[x] = this.V[y] - this.V[x];
                        break;
                    case 0xE:
                        this.V[0xF] = this.V[x] >> 7;
                        this.V[x] = this.V[x] * 2;
                        break;
                    default: console.log("instruction not implemented: ", this.OC.toString(16)); this.running = false; break;
                }
                break;
            case 0xA: this.I = nnn; break; // LD I, nnn
            case 0xB: this.PC = nnn + this.V[0x0]; break;
            case 0xC: this.V[x] = Math.floor(Math.random() * 256) & kk; break;
            case 0xD: // i'll finish this later
                let posX = this.V[x];
                let posY = this.V[y];
                for (let rows = 0; rows < n; rows++) {
                    let currpixel = this.mem[this.I + rows];
                    let y = (rows + posY) * 64;

                    for (let columns = 0; columns < 8; columns++) {
                        let index = columns + posX + y;
                        this.drawPixel(index * 4, 0xFFFFFF * ((currpixel & 0x80) === 0x80));
                        currpixel <<= 1;
                    }
                    this.drawFlag = true;
                }
                break;
            case 0xE:
                switch (kk) {
                    case 0x9E: break;
                }
                break;
            case 0xF:
                switch (kk) {
                    case 0x1E: this.I = this.I + this.V[x]; break;
                }
                break;
            default: console.log("instruction not implemented: ", this.OC.toString(16)); this.running = false; break;
        }

        if (this.drawFlag) {
            this.drawFlag = false;
            ctx.putImageData(this.framebuffer, 0, 0);
        }
    }

    loadRom(rom) {
        this.reset();
        for (let i = 0; i < rom.length; i++) {
            this.mem[i + 0x200] = rom[i];
        }
    }
}
