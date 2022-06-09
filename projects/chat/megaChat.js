import LoginWindow from './ui/loginWindow';
import MainWindow from './ui/mainWindow';
import UserName from './ui/userName';
import UserList from './ui/userList';
import UserPhoto from './ui/userPhoto';
import MessageList from './ui/messageList';
import MessageSender from './ui/messageSender';
import WSClient from './wsClient';

export default class MegaChat {
  constructor() {
    this.wsClient = new WSClient(
      `ws://${location.host}/chat/ws`, // подключаемся к серверу
      this.onMessage.bind(this) // когда с сервера будут приходить сообщения по сокету - будем выполнять метод onMessage (стр 68 ниже)
    );

    this.ui = {
      // складываем в объект ui - объекты наших классов
      loginWindow: new LoginWindow( // когда создаем экземпляр класса LoginWindow
        document.querySelector('#login'), // передаем туда селектор того элемента, где окно находится (html - <div id="login" class="hidden"> )
        this.onLogin.bind(this) // вторым аргументом передаем метод: onLogin - когда: Войти -> вызываем onLogin (стр.58 ниже)
      ),

      // каждый элемент интерфейса оборачиваем в класс:
      mainWindow: new MainWindow(document.querySelector('#main')), // класс окошка для логина: MainWindow
      userName: new UserName(document.querySelector('[data-role=user-name]')), // класс для имени юзера (завязываемся на роли)
      //берет элемент: [data-role=user-name] и передает в UserName (идем в userName.js)
      userList: new UserList(document.querySelector('[data-role=user-list]')), // класс для списка юзеров
      messageList: new MessageList(document.querySelector('[data-role=messages-list]')), // класс для списка сообщений
      messageSender: new MessageSender( // отправка сообщений
        document.querySelector('[data-role=message-sender]'),
        this.onSend.bind(this) // когда нажимаем на отправить: вызываем функцию onSend
      ),
      userPhoto: new UserPhoto( // ui компонент для аватарки
        document.querySelector('[data-role=user-photo]'),
        this.onUpload.bind(this) // --- когда D&D перетаскиваем картинку -->
      ),
    };

    this.ui.loginWindow.show(); // когда страничка загрузилась, вызываем метод show у loginWindow
  }

  onUpload(data) {
    this.ui.userPhoto.set(data); // ---> этот файл с картинкой передаем обратно, в качестве бэкграунда

    fetch('/chat/upload-photo', {
      // отправляем фотографию на сервер
      method: 'post',
      body: JSON.stringify({
        name: this.ui.userName.get(), // от какого пользователя фотография
        image: data, // в base-64 данные
      }),
    });
  }

  onSend(message) {
    this.wsClient.sendTextMessage(message); // обращаемся к вс клиенту и говорим, отправить сообщение
    this.ui.messageSender.clear(); // и, после, очищаем поле для ввода текста
  }

  async onLogin(name) {
    await this.wsClient.connect(); // соединяемся с сервером + новый объект wsClient (создаем его в конструкторе, стр 12 выше)
    // а коннектимся -> wsClient.js, строка: 7
    this.wsClient.sendHello(name); // приветики, серверик
    this.ui.loginWindow.hide(); // скрываем окно: логин
    this.ui.mainWindow.show(); // показываем главное окно
    this.ui.userName.set(name); // переходим к элементу userName - стр.25 выше
    this.ui.userPhoto.set(`/chat/photos/${name}.png?t=${Date.now()}`); // когда логинимся, в userPhoto устанавливаем нужный урл картинки (без кеша)
  }

  onMessage({ type, from, data }) {
    // обработка сообщений
    console.log(type, from, data);

    if (type === 'hello') {
      // каждый раз, когда по ws-серверу к нам приходит сообщение с типом: hello -
      // это значит, что в чат добавился новый пользователь и нам нужно отреагировать на это:
      this.ui.userList.add(from); // добавляем имя пользователя в список наших пользователей (userList.js)
      this.ui.messageList.addSystemMessage(`${from} вошел в чат`); // и показать системное сообщение об этом
      // когда получаем hello, вызываем addSystemMessage (см. messageList.js)
    } else if (type === 'user-list') {
      // сервер отправил нам список всех пользователей, которые у него сейчас есть
      // -- происходит в те моменты, когда мы логинимся в чате
      for (const item of data) {
        // перебираем список, который прислал веб сокет сервер
        this.ui.userList.add(item); // для каждого пользователя вызываем add - добавляем пользователя в список
      }
    } else if (type === 'bye-bye') {
      // ^^ :3 bye-bye - если пользователь выходит, передаем сообщение с типом: пока-пока
      this.ui.userList.remove(from); // вызываем метод: remove у нашего списка пользователей
      this.ui.messageList.addSystemMessage(`${from} вышел из чата`);
    } else if (type === 'text-message') {
      this.ui.messageList.add(from, data.message); // каждый раз, когда приходит сообщение, вызываем у messageList метод add
      // передаем от кого пришло сообщение и что в нем --> add см в messageList.js стр.8
    } else if (type === 'photo-changed') {
      // если тип сообщения: photo-changed
      const avatars = document.querySelectorAll(
        // ищем все сообщения от пользователя, от которого пришел photo-changed
        `[data-role=user-avatar][data-user=${data.name}]` // ищем все аватары нужного пользователя
      );

      for (const avatar of avatars) {
        avatar.style.backgroundImage = `url(/chat/photos/${
          // и обновляем изображение
          data.name
        }.png?t=${Date.now()})`; // сбрасываем кеш
      }
    }
  }
}
