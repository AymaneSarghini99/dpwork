import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback from the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken || refreshToken) {
          // Let Supabase handle the OAuth callback
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            console.error('Auth callback error:', error)
            navigate('/login')
            return
          }

          // Wait for session to be established
          let retries = 0
          const maxRetries = 10
          
          const checkSession = async (): Promise<boolean> => {
            const { data: { session } } = await supabase.auth.getSession()
            
            if (session) {
              return true
            }
            
            if (retries < maxRetries) {
              retries++
              await new Promise(resolve => setTimeout(resolve, 500))
              return checkSession()
            }
            
            return false
          }
          
          const hasSession = await checkSession()
          
          if (hasSession) {
            // Successfully authenticated, redirect to main app
            navigate('/')
          } else {
            // No session after retries, redirect to login
            navigate('/login')
          }
        } else {
          // No auth parameters, redirect to login
          navigate('/login')
        }
      } catch (error) {
        console.error('Error during auth callback:', error)
        navigate('/login')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-3xl" />
      </div>

      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Completing authentication...</p>
      </div>
    </main>
  )
}

export default AuthCallback
