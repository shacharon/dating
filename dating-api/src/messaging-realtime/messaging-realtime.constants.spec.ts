import {
  sessionRoom,
  userRoom,
} from './messaging-realtime.constants';

describe('messaging-realtime.constants rooms', () => {
  it('builds stable user and session rooms', () => {
    expect(userRoom('u1')).toBe('user:u1');
    expect(sessionRoom('sess_1')).toBe('session:sess_1');
  });
});
