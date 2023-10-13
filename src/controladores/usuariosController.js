const pool = require('../conexao.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registrarUsuario = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        const usuarioEncontrado = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );
        const crypSenha = await bcrypt.hash(senha, 10);

        if (!nome || !email || !senha) {
            return res.status(400).json({ mensagem: 'O preenchimento dos dados são obrigatorios' });
        }

        if (usuarioEncontrado.rows.length > 0) {
            return res.status(400).json({ mensagem: 'Já existe usuário cadastrado com e-mail informado' });
        }

        const cadastrarUsuario = await pool.query(
            'INSERT INTO usuario (nome, email, senha) VALUE ($1, $2, $3) RETURNING id, nome, email',
            [nome, email, crypSenha]
        );

        const usuario = {
            id: cadastrarUsuario.rows[0].id,
            nome: cadastrarUsuario.rows[0].nome,
            email: cadastrarUsuario.rows[0].email
        }

        res.status(201).json(usuario);

    } catch (error) {
        res.status(500).json({ mensagem: 'Erro no servidor' });
    }

};