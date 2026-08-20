import { escapeHtml } from './email-format.util';
import {
  buildMutualMatchEmail,
  buildNewMessageEmail,
  buildPhotoRejectionEmail,
  buildReportOpsEmail,
} from './email-templates';

describe('email-templates', () => {
  describe('buildNewMessageEmail', () => {
    it('builds subject text and escaped html', () => {
      const tmpl = buildNewMessageEmail({
        senderLabel: 'A&B <C>',
        url: 'http://localhost:3000/dating/conversations/c1',
      });
      expect(tmpl.subject).toBe('New message on Piza');
      expect(tmpl.textBody).toContain('A&B <C> sent you a message');
      expect(tmpl.textBody).toContain(
        'http://localhost:3000/dating/conversations/c1',
      );
      expect(tmpl.htmlBody).toContain('<strong>A&amp;B &lt;C&gt;</strong>');
      expect(tmpl.htmlBody).toContain(
        'href="http://localhost:3000/dating/conversations/c1"',
      );
    });
  });

  describe('buildMutualMatchEmail', () => {
    it('builds subject text and escaped html', () => {
      const tmpl = buildMutualMatchEmail({
        otherLabel: 'Bob "B"',
        url: 'http://localhost:3000/dating/conversations/m1',
      });
      expect(tmpl.subject).toBe("It's a match on Piza!");
      expect(tmpl.textBody).toContain('You matched with Bob "B"');
      expect(tmpl.htmlBody).toContain('<strong>Bob &quot;B&quot;</strong>');
    });
  });

  describe('buildPhotoRejectionEmail', () => {
    it('escapes reason and url in html', () => {
      const tmpl = buildPhotoRejectionEmail({
        reason: 'Too blurry <img>',
        url: 'http://localhost:3000/dating/profile#profile-photos',
      });
      expect(tmpl.subject).toBe('Your photo was not approved');
      expect(tmpl.textBody).toContain('Too blurry <img>');
      expect(tmpl.htmlBody).toContain('Too blurry &lt;img&gt;');
      expect(tmpl.htmlBody).toContain(
        'href="http://localhost:3000/dating/profile#profile-photos"',
      );
    });
  });

  describe('buildReportOpsEmail', () => {
    const base = {
      id: 'rpt_1',
      reason: 'SPAM',
      reporterUserId: 'u1',
      reportedUserId: 'u2',
      contextType: 'MESSAGE',
      contextId: 'msg_1',
      createdAt: new Date('2026-08-20T12:00:00.000Z'),
      details: null as string | null,
    };

    it('builds ops subject and body without details', () => {
      const tmpl = buildReportOpsEmail(base);
      expect(tmpl.subject).toBe('[dating] User report — SPAM');
      expect(tmpl.textBody).toContain('Report id: rpt_1');
      expect(tmpl.textBody).not.toContain('Details:');
      expect(tmpl.htmlBody).toBe(`<pre>${escapeHtml(tmpl.textBody)}</pre>`);
    });

    it('appends details when present and escapes html', () => {
      const tmpl = buildReportOpsEmail({
        ...base,
        details: 'Said <script>hi</script>',
      });
      expect(tmpl.textBody).toContain('Details:');
      expect(tmpl.textBody).toContain('Said <script>hi</script>');
      expect(tmpl.htmlBody).toContain('Said &lt;script&gt;hi&lt;/script&gt;');
    });
  });
});