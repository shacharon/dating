import { RealtimePublisher } from './realtime-publisher.service';
import { sessionRoom, userRoom } from './messaging-realtime.constants';

describe('RealtimePublisher', () => {
  it('emits to user room after bindNamespaceServer', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const namespace = { to } as unknown as import('socket.io').Namespace;

    const publisher = new RealtimePublisher();
    publisher.bindNamespaceServer(namespace);
    publisher.publishToUser('user_x', 'message.new', { id: 'msg_1' });

    expect(to).toHaveBeenCalledWith(userRoom('user_x'));
    expect(emit).toHaveBeenCalledWith('message.new', { id: 'msg_1' });
  });

  it('publishToUsers emits to each distinct user room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const namespace = { to } as unknown as import('socket.io').Namespace;

    const publisher = new RealtimePublisher();
    publisher.bindNamespaceServer(namespace);
    publisher.publishToUsers(
      ['user_a', 'user_b'],
      'message.new',
      { text: 'hi' },
    );

    expect(to).toHaveBeenCalledWith(userRoom('user_a'));
    expect(to).toHaveBeenCalledWith(userRoom('user_b'));
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('disconnectSessionSockets targets session room', () => {
    const disconnectSockets = jest.fn();
    const inn = jest.fn().mockReturnValue({ disconnectSockets });
    const namespace = { in: inn } as unknown as import('socket.io').Namespace;

    const publisher = new RealtimePublisher();
    publisher.bindNamespaceServer(namespace);
    publisher.disconnectSessionSockets('sess_1');

    expect(inn).toHaveBeenCalledWith(sessionRoom('sess_1'));
    expect(disconnectSockets).toHaveBeenCalledWith(true);
  });

  it('disconnectSessionSockets no-ops on blank session id', () => {
    const disconnectSockets = jest.fn();
    const inn = jest.fn().mockReturnValue({ disconnectSockets });
    const namespace = { in: inn } as unknown as import('socket.io').Namespace;

    const publisher = new RealtimePublisher();
    publisher.bindNamespaceServer(namespace);
    publisher.disconnectSessionSockets('  ');

    expect(inn).not.toHaveBeenCalled();
  });

  it('disconnectUserSockets targets user room', () => {
    const disconnectSockets = jest.fn();
    const inn = jest.fn().mockReturnValue({ disconnectSockets });
    const namespace = { in: inn } as unknown as import('socket.io').Namespace;

    const publisher = new RealtimePublisher();
    publisher.bindNamespaceServer(namespace);
    publisher.disconnectUserSockets('user_1');

    expect(inn).toHaveBeenCalledWith(userRoom('user_1'));
    expect(disconnectSockets).toHaveBeenCalledWith(true);
  });

  it('no-ops when namespace is not bound', () => {
    const publisher = new RealtimePublisher();
    expect(() =>
      publisher.publishToUser('user_x', 'ping', {}),
    ).not.toThrow();
    expect(() => publisher.disconnectSessionSockets('sess_1')).not.toThrow();
  });
});
