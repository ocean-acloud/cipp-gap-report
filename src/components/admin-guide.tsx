import { Copy, Download, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ADMIN_EXPORT, adminMessage } from "@/lib/admin-export"

function copy(text: string, ok: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(ok),
    () => toast.error("Clipboard blocked. Select the text and press Ctrl+C.")
  )
}

export function AdminGuide() {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="size-5 text-primary" /> Export a catalog from your CIPP
          <Badge variant="secondary">read-only</Badge>
        </CardTitle>
        <CardDescription>
          Gets a permission list that matches your own CIPP version. Upload it in Step 2 under &ldquo;Use my own catalog&rdquo;.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <details className="rounded-lg border" open>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold select-none">Method 1: one-click export (recommended)</summary>
          <div className="space-y-3 border-t px-4 py-3 text-sm">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Log in to CIPP with a <b>superadmin</b> account and stay on that tab.</li>
              <li>Press <kbd className="rounded border px-1">F12</kbd> → <b>Console</b>. If Edge blocks pasting, type <code>allow pasting</code> and press Enter.</li>
              <li>Paste the snippet below and press Enter. It downloads <code>cipp-admin-catalog.csv</code>.</li>
              <li>Check the pop-up. A full catalog has about <b>54</b> permissions. A much lower number means some were not returned, so also use Method 2.</li>
              <li>Upload the CSV in <b>Step 2 → Use my own catalog</b>, then build the report.</li>
            </ol>
            <pre className="max-h-32 overflow-auto rounded-md border bg-muted p-3 font-mono text-xs break-all whitespace-pre-wrap">{ADMIN_EXPORT}</pre>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(ADMIN_EXPORT, "Export snippet copied")}>
                <Copy /> Copy snippet
              </Button>
              <Button size="sm" onClick={() => copy(adminMessage(window.location.href.split("#")[0]), "Message for your admin copied")}>
                <Copy /> Copy message for my admin
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              It only reads <code>/api/me</code> and <code>/api/ListCustomRole</code> with the admin's own login and saves permission names. It sends nothing anywhere and contains no tenant or user data.
            </p>
          </div>
        </details>

        <details className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold select-none">Method 2: copy from the CIPP Roles page</summary>
          <div className="space-y-2 border-t px-4 py-3 text-sm">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Go to <b>CIPP → Advanced → Authentication → CIPP Roles</b>.</li>
              <li>Pick a role and choose <b>More Info</b>.</li>
              <li>Copy the list under <b>Effective Permissions (at last save)</b>.</li>
              <li>Paste it into <b>Step 2 → Use my own catalog</b>. A plain list like <code>Tenant.Administration.Read</code> is accepted.</li>
            </ol>
          </div>
        </details>

        <Alert>
          <AlertTitle>What you get</AlertTitle>
          <AlertDescription>
            <p>A catalog from CIPP itself holds permission names only, so the report compares permissions and access levels. For pages and functions, use the default catalog.</p>
          </AlertDescription>
        </Alert>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const csv = "Permission\r\nTenant.Administration\r\nIdentity.User\r\n"
            const a = document.createElement("a")
            a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
            a.download = "permission-only-template.csv"
            document.body.appendChild(a)
            a.click()
            a.remove()
          }}
        >
          <Download /> Permission-only CSV template
        </Button>
      </CardContent>
    </Card>
  )
}
