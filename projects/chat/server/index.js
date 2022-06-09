const fs = require('fs');
const path = require('path');
const http = require('http'); // создаем http сервер
const { Server } = require('ws'); // поверх создаем ws сервер

function readBody(req) {
  return new Promise((resolve, reject) => {
    let dataRaw = '';
    // читаем входящий контент и при помощи JSON.parse получим отправляемый объект
    req.on('data', (chunk) => (dataRaw += chunk));
    req.on('error', reject);
    req.on('end', () => resolve(JSON.parse(dataRaw)));
  });
}

const server = http.createServer(async (req, res) => {
  try {
    // --- проксирование изображений ---
    if (/\/photos\/.+\.png/.test(req.url)) {
      // отлавливаем все попытки обратиться за изображением
      const [, imageName] = req.url.match(/\/photos\/(.+\.png)/) || []; // составляем путь к изображению
      const fallBackPath = path.resolve(__dirname, '../no-photo.png');
      const filePath = path.resolve(__dirname, '../photos', imageName);

      if (fs.existsSync(filePath)) {
        // если картинка уже есть
        return fs.createReadStream(filePath).pipe(res); // берем ее и отдаем в ответ
      } else {
        return fs.createReadStream(fallBackPath).pipe(res); // а если картинки нет, отдаем в ответ стандартную фотку с анонимусом
      }
      // --- загрузка изображений ---
    } else if (req.url.endsWith('/upload-photo')) {
      const body = await readBody(req); // вызываем функцию readBody - описана выше

      // при помощи регулярки вытаскиваем контент из base-64 строки
      const name = body.name.replace(/\.\.\/|\//, '');
      const [, content] = body.image.match(/data:image\/.+?;base64,(.+)/) || [];
      const filePath = path.resolve(__dirname, '../photos', `${name}.png`);

      if (name && content) {
        fs.writeFileSync(filePath, content, 'base64'); // и этот контент записываем в файл

        broadcast(connections, { type: 'photo-changed', data: { name } }); // рассылаем сообщение, типа: photo-changed
        // по всем клиентам (когда меняем фотку, она обновляется в чатике у всех клиентов)
      } else {
        return res.end('fail');
      }
    }

    res.end('ok'); // http сервер всегда отвечает ок, на любой запрос
  } catch (e) {
    console.error(e);
    res.end('fail');
  }
});

const wss = new Server({ server }); // создаем ws сервер
const connections = new Map(); // каждый клиент, который будет подключен к серверу, будет помещен в эту карту - connections
// каждому клиенту будет присвоена некоторая информация

wss.on('connection', (socket) => {
  // каждый раз, когда кто-то подключается к вс-серверу (за это отвечает событие: connection)
  connections.set(socket, {}); // мы создаем новую запись, в нашей карте соответствий - const connections = new Map();
  // мы говорим: этому сокету (это по сути - клиент) - создай пустой объект (пока что, тк для нового клиента создаем какую-то метаинформацию)

  // дальше у этого сокета начинаем слушать сообщения, на предмет двух типов сообщений: message и close
  socket.on('message', (messageData) => {
    // message - когда клиент что-то присылает
    const message = JSON.parse(messageData);
    let excludeItself = false;

    if (message.type === 'hello') {
      // определяем тип сообщения. hello - это новый пользователь, для которого нужно задать метаинфу
      excludeItself = true;
      connections.get(socket).userName = message.data.name; // берем информацию о текущем соединении и присваем ему св-во userName
      // и берем его из данных о самом сообщении
      sendMessageTo(
        {
          type: 'user-list', // тому клиенту, который подсоединился, отправляем информацию с типом: user-list (список
          // выводится в левом блочке чата)
          data: [...connections.values()].map((item) => item.userName).filter(Boolean),
        },
        socket
      );
    }

    sendMessageFrom(connections, message, socket, excludeItself);
  });

  socket.on('close', () => {
    // клиент закрывает соединение
    sendMessageFrom(connections, { type: 'bye-bye' }, socket); // отправляем сообщение по всем доступным соединениям: bye-bye
    // и все клиенты получают уведомление о том, что пользователь вышел из чата
    connections.delete(socket);
  });
});

function sendMessageTo(message, to) {
  to.send(JSON.stringify(message));
}

function broadcast(connections, message) {
  for (const connection of connections.keys()) {
    connection.send(JSON.stringify(message));
  }
}

function sendMessageFrom(connections, message, from, excludeSelf) {
  const socketData = connections.get(from); // берется текущая метаинформация о текущем соединении, который отправляет сообщение

  if (!socketData) {
    return;
  }

  message.from = socketData.userName; // message.from - чтобы все остальные знали, от кого это сообщение пришло

  for (const connection of connections.keys()) {
    if (connection === from && excludeSelf) {
      continue;
    }

    connection.send(JSON.stringify(message)); // полученное сообщение рассылается по всем клиентам
  }
}

server.listen(8282);
