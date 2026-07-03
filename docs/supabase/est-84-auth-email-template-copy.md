# EST-84 Auth Email Template Copy

Supabase controls the actual authentication emails from the Supabase Dashboard, not from the React app. Use this document as the copy source when updating the Supabase Auth email templates.

Path in Supabase:

```txt
Supabase Dashboard → Authentication → Emails / Templates
```

## Important Behavior

Supabase's default secure email change flow sends confirmation emails to both the current email and the new email. Based on testing, the confirmation order does not appear to be the key part. The important part is that both emails must be confirmed, then the admin must sign out and sign back in with the new email.

With Supabase's default hosted Auth flow, the new-email confirmation email cannot be delayed until after the current email is confirmed. To make that exact sequence happen, we would need a custom server-side email-change request flow using a secure backend, a request table, and a custom email provider.

## Change Email Address Template

Use this for the Supabase `Change email address` template if custom email templates become available.

Subject:

```txt
Confirm admin email change request
```

HTML body:

```html
<h2>Confirm admin email change</h2>

<p>An admin email change was requested for Estanler A Visuals.</p>

<p>
  Current login email: <strong>{{ .Email }}</strong><br />
  Requested new email: <strong>{{ .NewEmail }}</strong>
</p>

<p>
  To complete this change, confirm both email messages. After both confirmations are complete, sign out and sign back in with the new email.
</p>

<p>
  <a href="{{ .ConfirmationURL }}">Confirm email change</a>
</p>

<p>
  If you did not request this change, do not click the link. Keep using the current login email and review admin access immediately.
</p>
```

Plain-text style body if the dashboard asks for plain text:

```txt
Confirm admin email change

An admin email change was requested for Estanler A Visuals.

Current login email: {{ .Email }}
Requested new email: {{ .NewEmail }}

To complete this change, confirm both email messages. After both confirmations are complete, sign out and sign back in with the new email.

Confirm email change:
{{ .ConfirmationURL }}

If you did not request this change, do not click the link. Keep using the current login email and review admin access immediately.
```

## Reset Password Template

Use this for the Supabase `Reset password` template if custom email templates become available.

Subject:

```txt
Reset your Estanler A Visuals admin password
```

HTML body:

```html
<h2>Reset your admin password</h2>

<p>We received a request to reset the admin password for Estanler A Visuals.</p>

<p>
  <a href="{{ .ConfirmationURL }}">Reset admin password</a>
</p>

<p>This link expires shortly and can only be used once.</p>

<p>If you did not request this reset, ignore this email and review admin access immediately.</p>
```

Plain-text style body if the dashboard asks for plain text:

```txt
Reset your admin password

We received a request to reset the admin password for Estanler A Visuals.

Reset admin password:
{{ .ConfirmationURL }}

This link expires shortly and can only be used once.

If you did not request this reset, ignore this email and review admin access immediately.
```
