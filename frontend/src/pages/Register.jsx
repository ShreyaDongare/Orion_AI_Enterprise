import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '../components/Input';
import Button from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  first_name: z
    .string()
    .min(2, 'First name is required'),

  last_name: z
    .string()
    .min(2, 'Last name is required'),

  email: z
    .string()
    .email('Please enter a valid corporate email'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

export default function Register() {
  const navigate = useNavigate();

  const {
    register: registerAuth,
    isLoading,
    error,
  } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    const success = await registerAuth(data);

    if (success) {
      toast.success(
        'Account created successfully! Redirecting to workspace...'
      );

      navigate('/dashboard', {
        replace: true,
      });

      return;
    }

    toast.error(
      error ||
        'Registration failed. Please check your information and try again.'
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />

        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-100 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.98,
          y: 10,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          duration: 0.3,
        }}
        className="relative z-10 w-full max-w-lg bg-white p-8 rounded-2xl border border-slate-200 shadow-md space-y-6"
      >

        {/* Header */}
        <div className="flex flex-col items-center">

          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Create OrionAI Account
          </h1>

          <p className="mt-2 text-sm text-slate-500 text-center">
            Provision your Enterprise Multi-Agent Workspace
          </p>

        </div>

        {/* Backend error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Registration form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >

          {/* First and Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            <Input
              id="register-fname-input"
              label="First Name"
              type="text"
              icon={User}
              placeholder="Alex"
              error={errors.first_name?.message}
              {...register('first_name')}
            />

            <Input
              id="register-lname-input"
              label="Last Name"
              type="text"
              icon={User}
              placeholder="Vance"
              error={errors.last_name?.message}
              {...register('last_name')}
            />

          </div>

          {/* Email */}
          <Input
            id="register-email-input"
            label="Corporate Email"
            type="email"
            icon={Mail}
            placeholder="alex.vance@company.com"
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Password */}
          <Input
            id="register-password-input"
            label="Password"
            type="password"
            icon={Lock}
            placeholder="••••••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Submit */}
          <Button
            id="register-submit-button"
            type="submit"
            variant="blue"
            size="lg"
            isLoading={isLoading}
            className="w-full justify-center"
            icon={ArrowRight}
            iconPosition="right"
          >
            Provision Enterprise Account
          </Button>

        </form>

        {/* Login link */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">

          <span>
            Already have an enterprise account?
          </span>

          <Link
            to="/login"
            className="text-blue-600 hover:underline font-bold"
          >
            Sign In
          </Link>

        </div>

        {/* Security */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono pt-2">

          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />

          <span>
            Secure JWT Authentication
          </span>

        </div>

      </motion.div>
    </div>
  );
}