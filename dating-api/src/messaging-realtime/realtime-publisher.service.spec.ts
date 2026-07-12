import { RealtimePublisher } from './realtime-publisher.service';
import { userRoom } from './messaging-realtime.constants';

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

  it('no-ops when namespace is not bound', () => {
    const publisher = new RealtimePublisher();
    expect(() =>
      publisher.publishToUser('user_x', 'ping', {}),
    ).not.toThrow();
  });
});
