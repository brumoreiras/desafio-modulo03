const pool = require('../conexao');

const listarCategorias = async (req, res) => {
    try {
        const categorias = await pool.query('SELECT * FROM categorias');
        return res.status(200).json(categorias.rows);
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ mensagem: 'Erro do servidor' });
    }
}

const cadastrarTransacao = async (req, res) => {
    const { descricao, valor, data, categoria_id, tipo } = req.body;
    const { id: usuario_id } = req.usuario;
    console.log("testetetetete", req.usuario);
    try {
        const { rows } = await pool.query(`INSERT INTO transacoes (tipo, descricao, valor, data, usuario_id, categoria_id  ) VALUES
            ($1, $2, $3, $4, $5, $6) returning *`, [tipo, descricao, valor, data, usuario_id, categoria_id]
        );

        const categorias = await pool.query(`SELECT descricao FROM categorias WHERE id = $1`, [categoria_id]);

        const transacao = { ...rows[0], categoria_nome: categorias.rows[0].descricao };
        console.log("QUALQUER MENSAGEM AE", transacao);
        return res.status(201).json(transacao);
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ mensagem: "Erro interno no servidor" });
    }
};

const listarTransacoes = async (req, res) => {
    const { id: usuario_id } = req.usuario;
    const { filtro } = req.query;

    try {
        if (filtro) {
            let categorias = [];

            for (let i = 0; i < Array(filtro).length; i++) {
                const element = Array(filtro)[i];

                const { rows } = await pool.query(`SELECT id FROM categorias WHERE descricao ILIKE $1`, [element]);
                categorias.push(rows[0].id);
            }

            let transacoes = [];

            for (let i = 0; i < categorias.length; i++) {
                const categoria_id = categorias[i];

                const { rows, rowCount } = await pool.query(`SELECT * FROM transacoes WHERE usuario_id = $1 AND categoria_id = $2`, [usuario_id, categoria_id]);

                if (rowCount > 0) {
                    transacoes.push(rows[0]);
                }
            }
            return res.status(200).json(transacoes);
        }

        const { rows, rowCount } = await pool.query(`SELECT * FROM transacoes WHERE usuario_id = $1`, [usuario_id]);

        if (rowCount < 1) {
            return res.status(200).json([])
        }

        return res.status(200).json(rows[0]);
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ mensagem: "Erro interno no servidor" });
    }
}

const detalharTransacao = async (req, res) => {
    const { id: transacao_id } = req.params;
    const { id } = req.usuario;

    try {
        const { rowCount, rows } = await pool.query(`SELECT * FROM transacoes WHERE id = $1`, [transacao_id]);

        if (rowCount < 1) {
            return res.status(404).json({ mensagem: "Transação não encontrada." });
        }

        if (id !== rows[0].usuario_id) {
            return res.status(401).json({ mensagem: "Transação não pertence ao usuário logado." })
        }

        const categorias = await pool.query(`SELECT descricao FROM categorias WHERE id = $1`, [rows[0].categoria_id]);

        const transacao = { ...rows[0], categoria_nome: categorias.rows[0].descricao };

        return res.status(200).json(transacao);
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ mensagem: "Erro interno no servidor" });
    }
}

const atualizarTransacao = async (req, res) => {
    const { descricao, valor, data, categoria_id, tipo } = req.body;
    const { id: transacao_id } = req.params;
    const { id: usuarioId } = req.usuario;

    try {
        const { rowCount, rows } = await pool.query(`SELECT usuario_id FROM transacoes WHERE id = $1`, [transacao_id]);

        if (rowCount < 1) {
            return res.status(404).json({ mensagem: "Transação não encontrada." });
        }

        if (usuarioId !== rows[0].usuario_id) {
            return res.status(401).json({ mensagem: "Transação não pertence ao usuário logado." })
        }

        await pool.query(`UPDATE transacoes SET descricao = $1, valor = $2, data = $3, categoria_id = $4, tipo = $5 WHERE id = $6`,
            [descricao, valor, data, categoria_id, tipo, transacao_id]);

        return res.status(204).json();
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ mensagem: "Erro interno no servidor" });
    }
}

const excluirTransacao = async (req, res) => {
    const { id: transacao_id } = req.params;
    const { id: usuarioId } = req.usuario;

    try {
        const { rowCount, rows } = await pool.query(`SELCT usuario_id FROM transacoes WHERE id = $1`, [transacao_id]);

        if (rowCount < 1) {
            return res.status(404).json({ mensagem: "Transação não encontrada." });
        }

        if (usuarioId !== rows[0].usuario_id) {
            return res.status(401).json({ mensagem: "Transação não pertence ao usuário logado." })
        }

        await pool.query(`DELETE FROM transacoes WHERE id = $1`, [transacao_id]);

        return res.status(204).json();
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ mensagem: "Erro interno no servidor" });
    }
}

const extratoTransacoes = async (req, res) => {
    const { id: usuario_id } = req.usuario;

    try {
        const { rows, rowCount } = await pool.query(`SELECT valor, tipo FROM transacoes WHERE usuario_id = $1`, [usuario_id]);

        if (rowCount < 1) {
            let extrato = { entrada: 0, saida: 0 };
            return res.status(200).json(extrato);
        }

        const filtrarEntrada = rows.filter(transacao => transacao.tipo === "entrada");

        const filtrarSaida = rows.filter(transacao => transacao.tipo === "saida");

        const entradas = filtrarEntrada.map((transacao) => {
            return transacao.valor;
        });

        const saidas = filtrarSaida.map((transacao) => {
            return transacao.valor;
        });

        const valorInicial = 0;

        const somaEntrada = entradas.reduce((acumulador, valorAtual) => acumulador + valorAtual, valorInicial);

        const somaSaida = saidas.reduce((acumulador, valorAtual) => acumulador + valorAtual, valorInicial);

        if (filtrarEntrada.length === 0) {
            let extrato = { entrada: 0, saida: somaSaida };
            return res.status(200).json(extrato);
        }

        if (filtrarSaida.length === 0) {
            let extrato = { entrada: somaEntrada, saida: 0 };
            return res.status(200).json(extrato);
        }

        let extrato = { entrada: somaEntrada, saida: somaSaida }

        return res.status(200).json(extrato);

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ mensagem: "Erro interno no servidor" });
    }
}


module.exports = {
    listarCategorias,
    cadastrarTransacao,
    listarTransacoes,
    detalharTransacao,
    atualizarTransacao,
    excluirTransacao,
    extratoTransacoes
}