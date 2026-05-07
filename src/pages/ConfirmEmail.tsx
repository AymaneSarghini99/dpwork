import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { confirmEmail, resendConfirmationEmail } from '@/lib/auth'
import { toast } from 'sonner'

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resending'>('loading')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const token = searchParams.get('token')

  useEffect(() => {
    const confirmUserEmail = async () => {
      if (!token) {
        setStatus('error')
        setMessage('Invalid confirmation link')
        return
      }

      try {
        await confirmEmail(token)
        setStatus('success')
        setMessage('Email confirmed successfully! You can now sign in.')
      } catch (error: any) {
        setStatus('error')
        setMessage(error.message || 'Failed to confirm email')
      }
    }

    confirmUserEmail()
  }, [token])

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    try {
      setStatus('resending')
      await resendConfirmationEmail(email)
      setStatus('error')
      setMessage('Confirmation email sent! Please check your inbox.')
    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || 'Failed to resend confirmation email')
    }
  }

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-6">
          <h1 className="text-xs md:text-sm text-spaced text-muted-foreground font-light">
            DEEP WORK
          </h1>
          
          <div className="flex justify-center">
            {status === 'loading' || status === 'resending' ? (
              <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
            ) : status === 'success' ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : (
              <AlertCircle className="w-12 h-12 text-red-500" />
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-light text-foreground">
              {status === 'loading' ? 'Confirming your email...' :
               status === 'resending' ? 'Resending confirmation...' :
               status === 'success' ? 'Email Confirmed' :
               'Confirmation Failed'}
            </h2>
            <p className="text-xs text-muted-foreground/70">
              {message}
            </p>
          </div>
        </div>

        {(status === 'error' || status === 'resending') && !token && (
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 rounded-full border border-white/10 bg-white/[0.04] text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground/40 focus-visible:border-white/20 focus-visible:ring-0 transition-colors"
              />
            </div>

            <button
              onClick={handleResendEmail}
              disabled={status === 'resending'}
              className="w-full glass rounded-full px-6 py-4 flex items-center justify-center gap-3 hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {status === 'resending' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              <span className="text-xs tracking-[0.3em] font-medium">
                {status === 'resending' ? 'SENDING...' : 'RESEND CONFIRMATION'}
              </span>
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <Link 
              to="/login"
              className="w-full glass rounded-full px-6 py-4 flex items-center justify-center gap-3 hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02] text-center"
            >
              <span className="text-xs tracking-[0.3em] font-medium">
                SIGN IN TO YOUR ACCOUNT
              </span>
            </Link>
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-[10px] text-muted-foreground/50">
            {status === 'success' ? (
              <>Ready to start your focused work journey? <Link to="/login" className="text-foreground hover:text-foreground/80 transition-colors">Sign in here</Link></>
            ) : (
              <>Need help? <Link to="/login" className="text-foreground hover:text-foreground/80 transition-colors">Back to sign in</Link></>
            )}
          </p>
        </div>
      </div>
    </main>
  )
}

export default ConfirmEmail
