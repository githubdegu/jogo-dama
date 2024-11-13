const COR_TABULEIRO_CLARA = 0xdddddd;
const COR_TABULEIRO_ESCURA = 0x333333;
const COR_PECA_VERMELHA = 0xff4444;
const COR_PECA_AZUL = 0x4444ff;

let cena, camera, renderizador;
let tamanhoTabuleiro = 10; // Aumentar tamanho do tabuleiro para 10x10
let tamanhoQuadrado = 1;
let pecas = [];
let pecaSelecionada = null;
let jogadorAtual = 1;
let placares = { 1: 0, 2: 0 };
let indicadoresMovimento = [];
let indicadorMovimentoInvalido = null;

iniciar();
animar();

function iniciar() {
    cena = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(tamanhoTabuleiro / 2, 15, tamanhoTabuleiro / 2);
    camera.lookAt(tamanhoTabuleiro / 2, 0, tamanhoTabuleiro / 2);

    renderizador = new THREE.WebGLRenderer();
    renderizador.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderizador.domElement);

    criarTabuleiro();
    criarPecas();

    window.addEventListener('resize', aoRedimensionarJanela, false);
    window.addEventListener('click', aoClicar, false);

    atualizarIndicadorDeTurno();
}

function criarTabuleiro() {
    for (let i = 0; i < tamanhoTabuleiro; i++) {
        for (let j = 0; j < tamanhoTabuleiro; j++) {
            let cor = (i + j) % 2 === 0 ? COR_TABULEIRO_CLARA : COR_TABULEIRO_ESCURA;
            let quadrado = new THREE.Mesh(
                new THREE.PlaneGeometry(tamanhoQuadrado, tamanhoQuadrado),
                new THREE.MeshBasicMaterial({ color: cor })
            );
            quadrado.rotation.x = -Math.PI / 2;
            quadrado.position.set(i, 0, j);
            cena.add(quadrado);
        }
    }
}

function criarPecas() {
    for (let i = 0; i < tamanhoTabuleiro; i++) {
        for (let j = 0; j < tamanhoTabuleiro; j++) {
            if ((i + j) % 2 !== 0 && (j < 4 || j > 5)) {
                let cor = j < 4 ? COR_PECA_VERMELHA : COR_PECA_AZUL;
                let peca = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32),
                    new THREE.MeshBasicMaterial({ color: cor })
                );
                peca.position.set(i, 0.1, j);
                cena.add(peca);
                pecas.push({ mesh: peca, x: i, y: j, cor: cor, rei: false });
            }
        }
    }
}

function aoRedimensionarJanela() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
}

function aoClicar(evento) {
    let mouse = new THREE.Vector2();
    mouse.x = (evento.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(evento.clientY / window.innerHeight) * 2 + 1;

    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    let intersecoes = raycaster.intersectObjects(cena.children);

    if (intersecoes.length > 0) {
        let intersecao = intersecoes[0];
        // Arredondar as coordenadas corretamente
        let x = Math.round(intersecao.point.x);
        let z = Math.round(intersecao.point.z);

        // Garantir que as coordenadas estão dentro dos limites
        if (x >= 0 && x < tamanhoTabuleiro && z >= 0 && z < tamanhoTabuleiro) {
            if (jogadorAtual === 1) { // Jogador 1 (vermelho)
                if (pecaSelecionada) {
                    // Movimento do jogador 1
                    lidarComMovimento(x, z);
                } else {
                    // Selecionar peça do jogador 1
                    pecaSelecionada = pecas.find(peca => peca.x === x && peca.y === z && peca.cor === COR_PECA_VERMELHA);
                    if (pecaSelecionada) {
                        mostrarIndicadoresDeMovimento(pecaSelecionada);
                    } else {
                        console.log("Nenhuma peça vermelha foi selecionada.");
                    }
                }
            }
        }
    }
}

function lidarComMovimento(x, z) {
    if (x >= 0 && x < tamanhoTabuleiro && z >= 0 && z < tamanhoTabuleiro) {

        // Verificar se é um movimento simples ou uma captura
        if (movimentoValido(pecaSelecionada, { x: x, y: z }, false)) {
            moverPeca(pecaSelecionada, { x: x, y: z }, false);
        } else if (movimentoValido(pecaSelecionada, { x: x, y: z }, true)) {
            moverPeca(pecaSelecionada, { x: x, y: z }, true);
        } else {
            mostrarIndicadorMovimentoInvalido(x, z);
            console.log("Movimento inválido.");
        }
    }
}

function mostrarIndicadoresDeMovimento(peca) {
    limparIndicadoresDeMovimento();

    let direcao = peca.rei ? 1 : (peca.cor === COR_PECA_VERMELHA ? 1 : -1); // Rei pode mover em ambas as direções

    // Movimentos simples
    let movimentosPossiveis = [
        { x: peca.x - 1, y: peca.y + direcao },
        { x: peca.x + 1, y: peca.y + direcao }
    ];

    for (let movimento of movimentosPossiveis) {
        if (movimento.x >= 0 && movimento.x < tamanhoTabuleiro && movimento.y >= 0 && movimento.y < tamanhoTabuleiro) {
            if (movimentoValido(peca, movimento, false)) {
                let indicador = new THREE.Mesh(
                    new THREE.PlaneGeometry(tamanhoQuadrado, tamanhoQuadrado),
                    new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: 0.5, transparent: true })
                );
                indicador.rotation.x = -Math.PI / 2;
                indicador.position.set(movimento.x, 0.05, movimento.y);
                cena.add(indicador);
                indicadoresMovimento.push(indicador);
            }
        }
    }

    // Adicionar indicadores de captura
    let movimentosCaptura = [
        { x: peca.x - 2, y: peca.y + 2 * direcao, capturaX: peca.x - 1, capturaY: peca.y + direcao },
        { x: peca.x + 2, y: peca.y + 2 * direcao, capturaX: peca.x + 1, capturaY: peca.y + direcao }
    ];

    for (let movimento of movimentosCaptura) {
        if (movimento.x >= 0 && movimento.x < tamanhoTabuleiro && movimento.y >= 0 && movimento.y < tamanhoTabuleiro) {
            if (movimentoValido(peca, movimento, true)) {
                let indicador = new THREE.Mesh(
                    new THREE.PlaneGeometry(tamanhoQuadrado, tamanhoQuadrado),
                    new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true })
                );
                indicador.rotation.x = -Math.PI / 2;
                indicador.position.set(movimento.x, 0.05, movimento.y);
                cena.add(indicador);
                indicadoresMovimento.push(indicador);
            }
        }
    }
}

function mostrarIndicadorMovimentoInvalido(x, z) {
    if (indicadorMovimentoInvalido) {
        cena.remove(indicadorMovimentoInvalido);
    }
    let indicador = new THREE.Mesh(
        new THREE.PlaneGeometry(tamanhoQuadrado, tamanhoQuadrado),
        new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true })
    );
    indicador.rotation.x = -Math.PI / 2;
    indicador.position.set(x, 0.05, z);
    cena.add(indicador);
    indicadorMovimentoInvalido = indicador;
    setTimeout(() => {
        cena.remove(indicador);
        indicadorMovimentoInvalido = null;
    }, 500);
}

function limparIndicadoresDeMovimento() {
    for (let indicador of indicadoresMovimento) {
        cena.remove(indicador);
    }
    indicadoresMovimento = [];
}

function jogadaComputador() {
    // Filtrar peças do computador (Jogador 2 - azul)
    let pecasComputador = pecas.filter(peca => peca.cor === COR_PECA_AZUL);
    let melhorMovimento = null;

    // Priorizar capturas
    for (let peca of pecasComputador) {
        let opcoesX = [peca.x - 2, peca.x + 2];
        let z = peca.y - 2; // Computador move para trás
        for (let x of opcoesX) {
            let capturaX = (peca.x + x) / 2;
            let capturaZ = (peca.y + z) / 2;
            if (x >= 0 && x < tamanhoTabuleiro && z >= 0 && z < tamanhoTabuleiro) {
                let pecaCapturada = pecas.find(p => p.x === capturaX && p.y === capturaZ && p.cor === COR_PECA_VERMELHA);
                if (pecaCapturada && movimentoValido(peca, { x: x, y: z }, true)) {
                    melhorMovimento = { peca, alvoX: x, alvoZ: z, pecaCapturada };
                    break;
                }
            }
        }
        if (melhorMovimento) break;
    }

    // Se não houver capturas, fazer um movimento simples
    if (!melhorMovimento) {
        for (let peca of pecasComputador) {
            let opcoesX = [peca.x - 1, peca.x + 1];
            let z = peca.y - 1; // Computador move para trás
            for (let x of opcoesX) {
                if (x >= 0 && x < tamanhoTabuleiro && z >= 0 && z < tamanhoTabuleiro) {
                    if (movimentoValido(peca, { x: x, y: z }, false)) {
                        melhorMovimento = { peca, alvoX: x, alvoZ: z };
                        break;
                    }
                }
            }
            if (melhorMovimento) break;
        }
    }

    // Executar o melhor movimento encontrado
    if (melhorMovimento) {
        let { peca, alvoX, alvoZ, pecaCapturada } = melhorMovimento;
        if (pecaCapturada) {
            cena.remove(pecaCapturada.mesh);
            pecas = pecas.filter(p => p !== pecaCapturada);
            placares[2]++;
            document.getElementById('placarJogador2').innerText = placares[2];
            peca.mesh.position.set(alvoX, 0.1, alvoZ);
            peca.x = alvoX;
            peca.y = alvoZ;

            // Verificar se há capturas adicionais
            setTimeout(() => {
                if (podeCapturar(peca)) {
                    jogadaComputador();
                } else {
                    promoverPecaSeNecessario(peca);
                    jogadorAtual = 1;
                    atualizarIndicadorDeTurno();
                }
            }, 500);
        } else {
            peca.mesh.position.set(alvoX, 0.1, alvoZ);
            peca.x = alvoX;
            peca.y = alvoZ;
            promoverPecaSeNecessario(peca);
            jogadorAtual = 1;
            atualizarIndicadorDeTurno();
        }
    } else {
        jogadorAtual = 1;
        atualizarIndicadorDeTurno();
    }
}

function podeCapturar(peca) {
    let direcoes;

    if (peca.rei) {
        // Dama pode capturar em todas as direções diagonais
        direcoes = [
            { dx: -2, dy: 2 }, { dx: 2, dy: 2 },
            { dx: -2, dy: -2 }, { dx: 2, dy: -2 }
        ];
    } else {
        // Peças normais só podem capturar para frente (vermelhas) ou para trás (azuis)
        let direcao = peca.cor === COR_PECA_VERMELHA ? 2 : -2;
        direcoes = [
            { dx: -2, dy: direcao },
            { dx: 2, dy: direcao }
        ];
    }

    for (let dir of direcoes) {
        let novoX = peca.x + dir.dx;
        let novoY = peca.y + dir.dy;

        let capturadoX = peca.x + dir.dx / 2;
        let capturadoY = peca.y + dir.dy / 2;

        if (novoX >= 0 && novoX < tamanhoTabuleiro && novoY >= 0 && novoY < tamanhoTabuleiro) {
            let pecaCapturada = pecas.find(p => p.x === capturadoX && p.y === capturadoY && p.cor !== peca.cor);

            if (pecaCapturada && !pecas.find(p => p.x === novoX && p.y === novoY)) {
                return true;
            }
        }
    }

    return false;
}

function moverPeca(peca, posicaoAlvo, eCaptura) {
    // Armazenar a posição original da peça
    let xOriginal = peca.x;
    let yOriginal = peca.y;

    // Mover a peça para a nova posição
    peca.mesh.position.set(posicaoAlvo.x, 0.1, posicaoAlvo.y);
    peca.x = posicaoAlvo.x;
    peca.y = posicaoAlvo.y;

    if (eCaptura) {
        // Calcular a posição da peça capturada usando a posição original
        let meioX = (xOriginal + posicaoAlvo.x) / 2;
        let meioY = (yOriginal + posicaoAlvo.y) / 2;

        // Encontrar a peça capturada
        let pecaCapturada = pecas.find(p => p.x === meioX && p.y === meioY && p.cor !== peca.cor);

        // Verificar se a peça capturada foi encontrada
        if (pecaCapturada) {
            // Remover a peça capturada da cena
            cena.remove(pecaCapturada.mesh);

            // Remover a peça capturada do array de peças
            pecas = pecas.filter(p => p !== pecaCapturada);

            // Atualizar o placar
            placares[jogadorAtual]++;
            document.getElementById(`placarJogador${jogadorAtual}`).innerText = placares[jogadorAtual];
        }
    }

    // Verificar se há capturas adicionais
    setTimeout(() => {
        if (podeCapturar(peca)) {
            pecaSelecionada = peca; // Manter a peça selecionada para captura múltipla
            mostrarIndicadoresDeMovimento(peca); // Mostrar os indicadores de movimento/captura novamente
        } else {
            promoverPecaSeNecessario(peca); // Promover se necessário
            jogadorAtual = jogadorAtual === 1 ? 2 : 1; // Alternar turno
            pecaSelecionada = null;
            atualizarIndicadorDeTurno();

            // Verificar se há um vencedor
            verificarVencedor();

            // Se for o turno do computador, fazer a jogada dele
            if (jogadorAtual === 2) {
                setTimeout(jogadaComputador, 500);
            }
        }
    }, 500);
}
function promoverPecaSeNecessario(peca) {
    if ((peca.cor === COR_PECA_VERMELHA && peca.y === tamanhoTabuleiro - 1) || (peca.cor === COR_PECA_AZUL && peca.y === 0)) {
        peca.rei = true;
        peca.mesh.material.color.setHex(0xffff00); // Mudar a cor para indicar promoção
    }
}

function atualizarIndicadorDeTurno() {
    document.getElementById('labelJogador1').classList.toggle('ativo', jogadorAtual === 1);
    document.getElementById('labelJogador2').classList.toggle('ativo', jogadorAtual === 2);
}

function movimentoValido(peca, posicaoAlvo, eCaptura) {
    if (eCaptura) {
        // Calcular a posição da peça capturada
        let capturadoX = (peca.x + posicaoAlvo.x) / 2;
        let capturadoY = (peca.y + posicaoAlvo.y) / 2;

        // Verificar se o movimento é diagonal e de duas casas
        let movimentoValido = Math.abs(posicaoAlvo.x - peca.x) === 2 && Math.abs(posicaoAlvo.y - peca.y) === 2;

        // Verificar se há uma peça inimiga na posição intermediária
        let pecaCapturada = pecas.find(p => p.x === capturadoX && p.y === capturadoY && p.cor !== peca.cor);

        // Verificar se o destino está vazio
        let destinoVazio = !pecas.find(p => p.x === posicaoAlvo.x && p.y === posicaoAlvo.y);

        return movimentoValido && pecaCapturada && destinoVazio;
    } else {
        // Verificar se o destino está vazio
        if (!pecas.find(p => p.x === posicaoAlvo.x && p.y === posicaoAlvo.y)) {
            // Calcular a direção do movimento
            let dy = posicaoAlvo.y - peca.y;
            let dx = posicaoAlvo.x - peca.x;

            // Verificar se o movimento é diagonal e de uma casa
            let movimentoValido = Math.abs(dx) === 1 && Math.abs(dy) === 1;

            // Para peças não coroadas, verificar se estão se movendo na direção correta
            if (movimentoValido) {
                if (peca.rei) {
                    return true; // Damas podem mover-se em ambas as direções
                } else {
                    let direcao = peca.cor === COR_PECA_VERMELHA ? 1 : -1;
                    return dy === direcao;
                }
            }
        }
        return false;
    }
}

function verificarVencedor() {
    let pecasJogador1 = pecas.filter(p => p.cor === COR_PECA_VERMELHA);
    let pecasJogador2 = pecas.filter(p => p.cor === COR_PECA_AZUL);

    if (pecasJogador1.length === 0) {
        alert('Jogador 2 venceu!');
        reiniciarJogo();
    } else if (pecasJogador2.length === 0) {
        alert('Jogador 1 venceu!');
        reiniciarJogo();
    }
}

// Função para reiniciar o jogo
function reiniciarJogo() {
    // Remover todas as peças do tabuleiro
    for (let peca of pecas) {
        cena.remove(peca.mesh);
    }
    pecas = [];

    // Reiniciar as variáveis de controle
    pecaSelecionada = null;
    jogadorAtual = 1;
    placares = { 1: 0, 2: 0 };
    document.getElementById('placarJogador1').innerText = placares[1];
    document.getElementById('placarJogador2').innerText = placares[2];

    // Recriar as peças iniciais
    criarPecas();

    // Atualizar o indicador de turno
    atualizarIndicadorDeTurno();
}

function animar() {
    requestAnimationFrame(animar);
    renderizador.render(cena, camera);
}
