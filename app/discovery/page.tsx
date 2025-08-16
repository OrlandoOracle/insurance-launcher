import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FileText, Calendar, MapPin } from 'lucide-react'

export default async function DiscoveryListPage() {
  const sessions = await prisma.discoverySession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Discovery Sessions</h1>
          <p className="text-muted-foreground mt-1">
            Manage and review client discovery calls
          </p>
        </div>
        <Link href="/discovery/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Discovery Call
          </Button>
        </Link>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No discovery sessions yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a new discovery call to capture client information
            </p>
            <Link href="/discovery/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Start First Discovery Call
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const data = session.jsonPayload as any
            const status = data?.discovery?.status || {}
            const statusLabels = []
            if (status.losingCoverage) statusLabels.push('Losing Coverage')
            if (status.payingTooMuch) statusLabels.push('Paying Too Much')
            if (status.uninsured) statusLabels.push('Uninsured')

            return (
              <Link key={session.id} href={`/discovery/${session.sessionId}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {session.clientName || 'Unknown Client'}
                    </CardTitle>
                    <CardDescription>
                      Session ID: {session.sessionId.slice(-8)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                      
                      {(session.zip || session.state) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {[session.zip, session.county, session.state]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                      
                      {statusLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {statusLabels.map((label) => (
                            <span
                              key={label}
                              className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {data?.rapport?.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {data.rapport.length} rapport notes
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}