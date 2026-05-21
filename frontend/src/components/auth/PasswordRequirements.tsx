import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { PASSWORD_REQUIREMENTS } from '@/constants/auth.constants';

interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements = ({ password }: PasswordRequirementsProps) => {
  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="space-y-1 mt-2"
    >
      {PASSWORD_REQUIREMENTS.map((req) => {
        const passed = req.test(password);
        return (
          <div
            key={req.label}
            className={`flex items-center gap-2 text-xs ${
              passed ? 'text-green-600' : 'text-muted-foreground'
            }`}
          >
            {passed ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {req.label}
          </div>
        );
      })}
    </motion.div>
  );
};
