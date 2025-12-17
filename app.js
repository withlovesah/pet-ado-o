const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();

// Configurações básicas
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Sessão (30 minutos)
app.use(session({
  secret: 'segredo-super-seguro',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 60 * 1000 } // 30 min
}));

// "Banco" em memória
let interessados = [];
let pets = [];
let adocoes = [];

// Usuário fixo para login
const USUARIO_FIXO = {
  login: 'admin',
  senha: '123'
};

// Middleware: proteger rotas
function authMiddleware(req, res, next) {
  if (req.session && req.session.usuarioLogado) {
    return next();
  }
  return res.redirect('/login');
}

// Rota raiz
app.get('/', (req, res) => {
  res.redirect('/login');
});

// LOGIN
app.get('/login', (req, res) => {
  res.render('login', { erro: null });
});

app.post('/login', (req, res) => {
  const { login, senha } = req.body;

  if (login === USUARIO_FIXO.login && senha === USUARIO_FIXO.senha) {

    // Pega último acesso do cookie, antes de atualizar
    const ultimoAcesso = req.cookies.ultimoAcesso || null;

    req.session.usuarioLogado = {
      login: login
    };

    // Grava novo cookie de último acesso (agora)
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    res.cookie('ultimoAcesso', agora, { maxAge: 7 * 24 * 60 * 60 * 1000 });

    // Salva no session para mostrar no menu
    req.session.ultimoAcesso = ultimoAcesso;

    return res.redirect('/menu');
  }

  return res.render('login', { erro: 'Usuário ou senha inválidos.' });
});

// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// MENU (protegido)
app.get('/menu', authMiddleware, (req, res) => {
  const ultimoAcessoSession = req.session.ultimoAcesso || 'Este é seu primeiro acesso.';
  res.render('menu', {
    usuario: req.session.usuarioLogado.login,
    ultimoAcesso: ultimoAcessoSession
  });
});

// CADASTRO DE INTERESSADOS
app.get('/interessados', authMiddleware, (req, res) => {
  res.render('interessados', {
    erro: null,
    interessados: interessados
  });
});

app.post('/interessados', authMiddleware, (req, res) => {
  const { nome, email, telefone } = req.body;

  let erros = [];

  if (!nome || nome.trim() === '') erros.push('Nome é obrigatório.');
  if (!email || email.trim() === '') erros.push('E-mail é obrigatório.');
  if (!telefone || telefone.trim() === '') erros.push('Telefone é obrigatório.');

  if (erros.length > 0) {
    return res.render('interessados', {
      erro: erros.join(' '),
      interessados: interessados
    });
  }

  interessados.push({
    id: interessados.length + 1,
    nome,
    email,
    telefone
  });

  res.render('interessados', {
    erro: null,
    interessados: interessados
  });
});

// CADASTRO DE PETS
app.get('/pets', authMiddleware, (req, res) => {
  res.render('pets', {
    erro: null,
    pets: pets
  });
});

app.post('/pets', authMiddleware, (req, res) => {
  const { nome, raca, idade } = req.body;

  let erros = [];

  if (!nome || nome.trim() === '') erros.push('Nome do pet é obrigatório.');
  if (!raca || raca.trim() === '') erros.push('Raça é obrigatória.');
  if (!idade || idade.trim() === '') erros.push('Idade é obrigatória.');

  if (erros.length > 0) {
    return res.render('pets', {
      erro: erros.join(' '),
      pets: pets
    });
  }

  pets.push({
    id: pets.length + 1,
    nome,
    raca,
    idade
  });

  res.render('pets', {
    erro: null,
    pets: pets
  });
});

// DESEJO DE ADOÇÃO
app.get('/adocoes', authMiddleware, (req, res) => {
  res.render('adocoes', {
    erro: null,
    interessados: interessados,
    pets: pets,
    adocoes: adocoes
  });
});

app.post('/adocoes', authMiddleware, (req, res) => {
  const { interessadoId, petId } = req.body;

  let erros = [];

  if (!interessadoId || interessadoId === '') erros.push('Selecione um interessado.');
  if (!petId || petId === '') erros.push('Selecione um pet.');

  const interessado = interessados.find(i => i.id === parseInt(interessadoId));
  const pet = pets.find(p => p.id === parseInt(petId));

  if (!interessado) erros.push('Interessado inválido.');
  if (!pet) erros.push('Pet inválido.');

  if (erros.length > 0) {
    return res.render('adocoes', {
      erro: erros.join(' '),
      interessados: interessados,
      pets: pets,
      adocoes: adocoes
    });
  }

  const dataDesejo = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  adocoes.push({
    id: adocoes.length + 1,
    interessadoNome: interessado.nome,
    petNome: pet.nome,
    data: dataDesejo
  });

  res.render('adocoes', {
    erro: null,
    interessados: interessados,
    pets: pets,
    adocoes: adocoes
  });
});

// Roda localmente
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
