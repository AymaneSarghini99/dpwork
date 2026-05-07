import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Let Supabase handle the OAuth callback from the URL hash
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          navigate('/login')
          return
        }

        // Wait a moment for Supabase to process the session
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if we have a session after processing
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // Successfully authenticated, redirect to main app
          navigate('/')
        } else {
          // No session found, redirect to login
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
