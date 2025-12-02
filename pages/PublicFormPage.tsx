import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card, CardContent } from '../components/ui/Card';
import { Checkbox } from '../components/ui/Checkbox';
import { Form, FormField, FormTheme, FormSettings } from '../types/forms';
import { getFormBySlug, secureSubmitForm, trackFormEvent, uploadFormFile } from '../src/services/formService';

// Signature Canvas Component with proper scaling
const SignatureCanvas: React.FC<{
  id: string;
  value: string;
  onChange: (dataUrl: string) => void;
  error?: boolean;
  theme?: FormTheme;
}> = ({ id, value, onChange, error, theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set actual pixel dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = theme?.textColor || '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [theme]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onChange('');
    }
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        id={id}
        className={`w-full h-32 border-2 ${error ? 'border-red-500' : 'border-black'} bg-white cursor-crosshair touch-none`}
        style={{ borderColor: error ? '#EF4444' : (theme?.borderColor || '#000000') }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <button
        type="button"
        onClick={clearCanvas}
        className="absolute top-2 right-2 text-xs text-gray-500 hover:text-black underline"
      >
        Clear
      </button>
    </div>
  );
};

export const PublicFormPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2));
  const [hasStarted, setHasStarted] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const [displayFields, setDisplayFields] = useState<FormField[]>([]);
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(new Set());
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) {
      loadForm();
    }
  }, [slug]);

  // Load captcha script when captcha is enabled
  useEffect(() => {
    if (!form?.settings?.captchaEnabled || !form.settings.captchaType || form.settings.captchaType === 'none') {
      return;
    }

    const captchaType = form.settings.captchaType;
    const siteKey = captchaType === 'recaptcha' 
      ? import.meta.env.VITE_RECAPTCHA_SITE_KEY 
      : import.meta.env.VITE_HCAPTCHA_SITE_KEY;

    if (!siteKey) {
      console.warn(`Captcha enabled but ${captchaType} site key not configured`);
      return;
    }

    // Load captcha script
    const scriptId = `captcha-script-${captchaType}`;
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.defer = true;

    if (captchaType === 'recaptcha') {
      script.src = 'https://www.google.com/recaptcha/api.js';
      (window as any).onRecaptchaLoad = () => {
        if (captchaRef.current && (window as any).grecaptcha) {
          (window as any).grecaptcha.render(captchaRef.current, {
            sitekey: siteKey,
            callback: (token: string) => setCaptchaToken(token),
            'expired-callback': () => setCaptchaToken(null),
          });
        }
      };
      script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    } else if (captchaType === 'hcaptcha') {
      script.src = 'https://js.hcaptcha.com/1/api.js';
      script.onload = () => {
        if (captchaRef.current && (window as any).hcaptcha) {
          (window as any).hcaptcha.render(captchaRef.current, {
            sitekey: siteKey,
            callback: (token: string) => setCaptchaToken(token),
            'expired-callback': () => setCaptchaToken(null),
          });
        }
      };
    }

    document.head.appendChild(script);

    return () => {
      // Cleanup is tricky with captcha scripts - usually just leave them
    };
  }, [form?.settings?.captchaEnabled, form?.settings?.captchaType]);

  // Track abandon event when user leaves without submitting
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only track if form was loaded, user interacted, and didn't submit
      if (form && hasStarted && !submitted) {
        // Use sendBeacon for reliable delivery during page unload
        const payload = JSON.stringify({
          form_id: form.id,
          event_type: 'abandon',
          event_data: {
            sessionId,
            timeSpent: startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0,
            fieldsCompleted: Object.keys(formValues).filter(key => {
              const val = formValues[key];
              return val !== undefined && val !== null && val !== '' && 
                (!Array.isArray(val) || val.length > 0);
            }).length,
            totalFields: displayFields.filter(f => !['heading', 'paragraph', 'divider', 'image'].includes(f.type)).length,
          },
        });
        
        // Use sendBeacon for reliable delivery - it doesn't require CORS and works during unload
        navigator.sendBeacon('/api/form-analytics', payload);
        
        // Also try to track via service (may not complete during unload)
        trackFormEvent(form.id, 'abandon', {
          sessionId,
          data: {
            timeSpent: startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0,
            fieldsCompleted: Object.keys(formValues).filter(key => {
              const val = formValues[key];
              return val !== undefined && val !== null && val !== '' && 
                (!Array.isArray(val) || val.length > 0);
            }).length,
          },
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form, hasStarted, submitted, sessionId, formValues, displayFields]);

  const loadForm = async (password?: string) => {
    try {
      const { data, error: fetchError, passwordRequired: needsPassword } = await getFormBySlug(slug!, password);
      
      // Handle password requirement - server returns minimal form data
      if (needsPassword && !password) {
        setPasswordRequired(true);
        if (data) {
          // Set minimal form data for password screen styling
          setForm(data);
        }
        setLoading(false);
        return;
      }
      
      if (fetchError || !data) {
        setError(fetchError || 'Form not found');
        setLoading(false);
        return;
      }

      // Server already validated status/expiry/limits - if we got here, form is accessible
      // These checks are redundant but provide client-side feedback
      if (data.status !== 'published') {
        setError('This form is not currently accepting responses');
        setLoading(false);
        return;
      }

      // Initialize form values with default values
      const initialValues: Record<string, any> = {};
      data.fields?.forEach(field => {
        if (field.default_value !== undefined && field.default_value !== null) {
          initialValues[field.id] = field.default_value;
        }
      });
      setFormValues(initialValues);

      // Prepare display fields - shuffle if enabled
      let fieldsToDisplay = [...(data.fields || [])];
      if (data.settings?.shuffleQuestions) {
        // Only shuffle interactive fields, keep layout elements in place
        const layoutTypes = ['heading', 'paragraph', 'divider', 'image'];
        const layoutFields = fieldsToDisplay.filter(f => layoutTypes.includes(f.type));
        const interactiveFields = fieldsToDisplay.filter(f => !layoutTypes.includes(f.type));
        
        // Fisher-Yates shuffle for interactive fields
        for (let i = interactiveFields.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [interactiveFields[i], interactiveFields[j]] = [interactiveFields[j], interactiveFields[i]];
        }
        
        // Reconstruct with layout fields in original positions
        fieldsToDisplay = [];
        let interactiveIndex = 0;
        data.fields?.forEach((f, idx) => {
          if (layoutTypes.includes(f.type)) {
            fieldsToDisplay.push(f);
          } else {
            fieldsToDisplay.push(interactiveFields[interactiveIndex++]);
          }
        });
      }
      setDisplayFields(fieldsToDisplay);

      setForm(data);

      // Track view event
      trackFormEvent(data.id, 'view', {
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        utmParams: {
          utm_source: searchParams.get('utm_source') || undefined,
          utm_medium: searchParams.get('utm_medium') || undefined,
          utm_campaign: searchParams.get('utm_campaign') || undefined,
        },
        sessionId,
      });
    } catch (err) {
      setError('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const checkPassword = async () => {
    // Re-fetch form with password - server validates and returns full form if correct
    setLoading(true);
    try {
      const { data, error: fetchError, passwordRequired: stillNeedsPassword } = await getFormBySlug(slug!, passwordInput);
      
      if (stillNeedsPassword || fetchError) {
        setPasswordError(true);
        setLoading(false);
        return;
      }
      
      if (data) {
        // Password was correct - server returned full form
        setForm(data);
        setPasswordRequired(false);
        setPasswordError(false);
        
        // Initialize form values
        const initialValues: Record<string, any> = {};
        data.fields?.forEach(field => {
          if (field.default_value !== undefined && field.default_value !== null) {
            initialValues[field.id] = field.default_value;
          }
        });
        setFormValues(initialValues);
        setDisplayFields(data.fields || []);
      }
    } catch {
      setPasswordError(true);
    } finally {
      setLoading(false);
    }
  };

  // Check if field should be visible based on conditional logic
  const shouldShowField = useCallback((field: FormField): boolean => {
    if (!field.conditional_logic?.enabled) return true;
    
    const { conditions, logic, action } = field.conditional_logic;
    
    const results = conditions.map(condition => {
      const fieldValue = formValues[condition.fieldId];
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'contains':
          return String(fieldValue || '').includes(String(condition.value));
        case 'not_contains':
          return !String(fieldValue || '').includes(String(condition.value));
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value);
        case 'less_than':
          return Number(fieldValue) < Number(condition.value);
        case 'is_empty':
          return !fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0);
        case 'is_not_empty':
          return !!fieldValue && (!Array.isArray(fieldValue) || fieldValue.length > 0);
        default:
          return true;
      }
    });
    
    const conditionMet = logic === 'and' ? results.every(r => r) : results.some(r => r);
    
    if (action === 'show') return conditionMet;
    if (action === 'hide') return !conditionMet;
    return true; // 'require' action doesn't affect visibility
  }, [formValues]);

  const validateField = (field: FormField, value: any): string | null => {
    // Skip validation for hidden fields
    if (!shouldShowField(field)) return null;
    
    // Check if field is dynamically required via conditional logic
    const isDynamicallyRequired = field.conditional_logic?.enabled && 
      field.conditional_logic.action === 'require';
    
    if ((field.required || isDynamicallyRequired) && (!value || (typeof value === 'string' && !value.trim()))) {
      // Special handling for complex field types
      if (field.type === 'address' && typeof value === 'object') {
        if (!value.street || !value.city) {
          return `${field.label} requires at least street and city`;
        }
        return null;
      }
      if (field.type === 'file' || field.type === 'image') {
        if (!value || !value.data) {
          return `${field.label} is required`;
        }
        return null;
      }
      if (Array.isArray(value) && value.length === 0) {
        return `${field.label} is required`;
      }
      if (!value) {
        return `${field.label} is required`;
      }
    }

    const rules = field.validation_rules;
    
    if (rules?.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return `Minimum ${rules.minLength} characters required`;
    }
    
    if (rules?.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }
    
    if (rules?.min !== undefined && typeof value === 'number' && value < rules.min) {
      return `Minimum value is ${rules.min}`;
    }
    
    if (rules?.max !== undefined && typeof value === 'number' && value > rules.max) {
      return `Maximum value is ${rules.max}`;
    }

    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }
    
    if (field.type === 'phone' && value) {
      // Basic phone validation - allows various formats
      const phoneRegex = /^[\d\s\-+()]{7,20}$/;
      if (!phoneRegex.test(value)) {
        return 'Please enter a valid phone number';
      }
    }
    
    // Custom pattern validation
    if (rules?.pattern && value) {
      try {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(String(value))) {
          return rules.patternMessage || 'Invalid format';
        }
      } catch {
        // Invalid regex pattern, skip validation
      }
    }

    return null;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    // Track form start on first interaction
    if (!hasStarted) {
      setHasStarted(true);
      startTimeRef.current = Date.now();
      if (form) {
        trackFormEvent(form.id, 'start', {
          sessionId,
          userAgent: navigator.userAgent,
        });
      }
    }
    
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error on change
    if (fieldErrors[fieldId]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }

    // Track field interaction
    if (form) {
      trackFormEvent(form.id, 'field_interaction', {
        fieldId,
        sessionId,
      });
    }
  };

  // Handle file upload to storage bucket
  const handleFileUpload = async (fieldId: string, file: File) => {
    if (!form) return;

    // Validate file size client-side (server validates too)
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors(prev => ({ ...prev, [fieldId]: 'File size must be less than 10MB' }));
      return;
    }

    // Track form start if not already started
    if (!hasStarted) {
      setHasStarted(true);
      startTimeRef.current = Date.now();
      trackFormEvent(form.id, 'start', { sessionId, userAgent: navigator.userAgent });
    }

    // Set uploading state
    setUploadingFields(prev => new Set(prev).add(fieldId));
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });

    try {
      const result = await uploadFormFile(form.id, sessionId, file);
      
      if (!result.success) {
        setFieldErrors(prev => ({ ...prev, [fieldId]: result.error || 'Upload failed' }));
        return;
      }

      // Store URL and metadata (not Base64 data!)
      handleFieldChange(fieldId, {
        name: file.name,
        size: file.size,
        type: file.type,
        url: result.url,  // Storage URL instead of Base64
        path: result.path,
      });
    } catch (err: any) {
      setFieldErrors(prev => ({ ...prev, [fieldId]: err.message || 'Upload failed' }));
    } finally {
      setUploadingFields(prev => {
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });
    }
  };

  // Effect to clear values of hidden fields when conditional logic hides them
  useEffect(() => {
    if (!form?.fields) return;
    
    const hiddenFieldIds = form.fields
      .filter(field => !shouldShowField(field))
      .map(field => field.id);
    
    if (hiddenFieldIds.length > 0) {
      setFormValues(prev => {
        const next = { ...prev };
        let changed = false;
        hiddenFieldIds.forEach(id => {
          if (next[id] !== undefined) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      
      // Also clear errors for hidden fields
      setFieldErrors(prev => {
        const next = { ...prev };
        let changed = false;
        hiddenFieldIds.forEach(id => {
          if (next[id]) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [formValues, form?.fields, shouldShowField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form?.fields || submitting) return;

    // Validate all visible fields only
    const errors: Record<string, string> = {};
    form.fields.forEach(field => {
      if (shouldShowField(field)) {
        const error = validateField(field, formValues[field.id]);
        if (error) {
          errors[field.id] = error;
        }
      }
    });

    // Validate captcha if enabled
    if (form.settings?.captchaEnabled && form.settings.captchaType !== 'none' && !captchaToken) {
      errors.captcha = 'Please complete the captcha verification';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      // Calculate completion time from first interaction, not page load
      const completionTime = startTimeRef.current 
        ? Math.round((Date.now() - startTimeRef.current) / 1000)
        : 0;
      
      // Build CRM tracking data from form defaults and URL params
      const campaignId = searchParams.get('campaign_id') || form.default_campaign_id;
      const accountId = searchParams.get('account_id') || form.default_account_id;
      const contactId = searchParams.get('contact_id');
      const dealId = searchParams.get('deal_id');
      
      // Filter out hidden field values before submission (clean data only)
      const submissionData: Record<string, any> = {};
      form.fields?.forEach(field => {
        if (shouldShowField(field) && formValues[field.id] !== undefined) {
          submissionData[field.id] = formValues[field.id];
        }
      });
      
      // Determine if Edge Function is required
      // - If captcha is enabled and token is present, must use Edge Function
      // - Edge Function provides: captcha verification, server-side IP hashing
      const captchaRequired = settings?.captchaEnabled && settings.captchaType !== 'none';
      const shouldUseEdgeFunction = captchaRequired && !!captchaToken;
      
      // If captcha is required but no token, the RPC will reject (server-side enforcement)
      const { error: submitError } = await secureSubmitForm(form.id, submissionData, {
        password: passwordInput || undefined,
        sessionId,
        captchaToken: captchaToken || undefined,
        captchaProvider: settings?.captchaType === 'none' ? undefined : settings?.captchaType,
        useEdgeFunction: shouldUseEdgeFunction,
        metadata: {
          sourceUrl: window.location.href,
          utmParams: {
            utm_source: searchParams.get('utm_source') || undefined,
            utm_medium: searchParams.get('utm_medium') || undefined,
            utm_campaign: searchParams.get('utm_campaign') || undefined,
            utm_term: searchParams.get('utm_term') || undefined,
            utm_content: searchParams.get('utm_content') || undefined,
          },
          completionTime,
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          campaignId: campaignId || undefined,
          accountId: accountId || undefined,
          contactId: contactId || undefined,
          dealId: dealId || undefined,
        },
      });

      if (submitError) {
        throw new Error(submitError);
      }

      // Track submission
      trackFormEvent(form.id, 'submit', {
        sessionId,
        data: { completionTime },
      });

      setSubmitted(true);

      // Redirect if configured
      if (form.settings?.redirectUrl) {
        setTimeout(() => {
          let redirectUrl = form.settings!.redirectUrl!.trim();
          // Ensure URL has a protocol, default to https://
          if (redirectUrl && !redirectUrl.match(/^https?:\/\//i)) {
            redirectUrl = 'https://' + redirectUrl;
          }
          window.location.href = redirectUrl;
        }, 1500);
      }
    } catch (err) {
      setFieldErrors({ submit: 'Failed to submit form. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent>
            <div className="text-center">
              <span className="text-6xl mb-4 block">❌</span>
              <h1 className="text-xl font-bold text-black mb-2">Oops!</h1>
              <p className="text-gray-600">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) return null;

  const theme = form.theme;
  const settings = form.settings;
  const fields = form.fields || [];

  // Password protection screen
  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent>
            <div className="text-center">
              <span className="text-6xl mb-4 block">🔒</span>
              <h1 className="text-xl font-bold text-black mb-2">Password Protected</h1>
              <p className="text-gray-600 mb-6">Enter the password to access this form</p>
              <div className="space-y-4">
                <Input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  error={passwordError ? 'Incorrect password' : undefined}
                  onKeyPress={(e) => e.key === 'Enter' && checkPassword()}
                />
                <Button onClick={checkPassword} fullWidth>
                  Access Form
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (submitted) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: theme?.backgroundColor || '#F3F4F6' }}
      >
        <Card className="max-w-md w-full">
          <CardContent>
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${theme?.successColor || '#10B981'}20` }}
              >
                <span className="text-4xl">✅</span>
              </div>
              <h1 
                className="text-2xl font-bold mb-2"
                style={{ color: theme?.textColor || '#1F2937' }}
              >
                Thank you!
              </h1>
              <p style={{ color: theme?.textColor || '#6B7280' }}>
                {settings?.confirmationMessage || 'Your response has been submitted.'}
              </p>
              {settings?.redirectUrl && (
                <p className="text-sm mt-4 text-gray-500">
                  Redirecting...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate progress - only count visible, required fields that have been answered
  const visibleRequiredFields = displayFields.filter(f => 
    shouldShowField(f) && 
    f.required && 
    !['heading', 'paragraph', 'divider', 'image'].includes(f.type)
  );
  const answeredRequiredFields = visibleRequiredFields.filter(f => {
    const val = formValues[f.id];
    return val !== undefined && val !== null && val !== '' && 
           (!Array.isArray(val) || val.length > 0);
  });
  const progress = visibleRequiredFields.length > 0 
    ? (answeredRequiredFields.length / visibleRequiredFields.length) * 100 
    : 0;

  // Helper to get field width style
  const getFieldWidthStyle = (field: FormField): React.CSSProperties => {
    const width = field.styling?.width || '100%';
    const alignment = field.styling?.alignment || 'left';
    return {
      width,
      textAlign: alignment as any,
    };
  };

  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: theme?.backgroundColor || '#F3F4F6' }}
    >
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent>
              {/* Logo */}
              {form.branding?.logoUrl && form.branding?.logoPosition !== 'hidden' && (
                <div
                  className={`mb-6 ${
                    form.branding.logoPosition === 'center' ? 'text-center' : 
                    form.branding.logoPosition === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  <img
                    src={form.branding.logoUrl}
                    alt="Logo"
                    className={`inline-block ${
                      form.branding.logoSize === 'small' ? 'h-8' : 
                      form.branding.logoSize === 'large' ? 'h-16' : 'h-12'
                    }`}
                  />
                </div>
              )}

              {/* Progress bar */}
              {settings?.showProgressBar && (
                <div className="mb-6">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${progress}%`, 
                        backgroundColor: theme?.primaryColor || '#8B5CF6' 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Title */}
              <h1
                className="text-3xl font-bold mb-2"
                style={{ color: theme?.textColor || '#1F2937' }}
              >
                {form.name}
              </h1>
              {form.description && (
                <p 
                  className="mb-8"
                  style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}
                >
                  {form.description}
                </p>
              )}

              {/* Fields */}
              <div className="space-y-6">
                {displayFields.map((field, index) => {
                  // Check conditional logic visibility
                  if (!shouldShowField(field)) return null;
                  
                  const error = fieldErrors[field.id];
                  const value = formValues[field.id];
                  const widthStyle = getFieldWidthStyle(field);
                  
                  // Common input styles based on theme
                  const inputStyle = {
                    borderColor: error ? (theme?.errorColor || '#EF4444') : (theme?.borderColor || '#000000'),
                    borderRadius: theme?.borderRadius || '0px',
                    backgroundColor: theme?.inputBackground || '#FFFFFF',
                    color: theme?.textColor || '#1F2937',
                  };

                  // Render based on type
                  switch (field.type) {
                    case 'heading':
                      return (
                        <h2
                          key={field.id}
                          className="text-xl font-bold"
                          style={{ color: theme?.textColor || '#1F2937', ...widthStyle }}
                        >
                          {field.description || field.label}
                        </h2>
                      );

                    case 'paragraph':
                      return (
                        <p key={field.id} style={{ color: theme?.textColor || '#6B7280', ...widthStyle }}>
                          {field.description || field.label}
                        </p>
                      );

                    case 'divider':
                      return <hr key={field.id} className="border-2" style={{ borderColor: theme?.borderColor || '#E5E7EB', ...widthStyle }} />;

                    case 'textarea':
                      return (
                        <div key={field.id} style={widthStyle}>
                          <label className="block font-mono text-sm font-semibold mb-2" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <textarea
                            value={value || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full p-3 border-2"
                            style={inputStyle}
                            rows={4}
                          />
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                          {field.help_text && !error && (
                            <p className="text-xs mt-1" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>{field.help_text}</p>
                          )}
                        </div>
                      );

                    case 'select':
                      return (
                        <div key={field.id}>
                          <Select
                            label={`${settings?.showQuestionNumbers ? `${index + 1}. ` : ''}${field.label}`}
                            required={field.required}
                            options={field.options?.map(o => ({ value: o.value, label: o.label })) || []}
                            placeholder={field.placeholder || 'Select...'}
                            value={value || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            error={error}
                            helpText={field.help_text}
                          />
                        </div>
                      );

                    case 'radio':
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-3" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <div className="space-y-2">
                            {field.options?.map(opt => (
                              <label
                                key={opt.id}
                                className="flex items-center gap-3 p-3 border-2 cursor-pointer transition-colors"
                                style={{
                                  borderColor: value === opt.value ? (theme?.primaryColor || '#000000') : (theme?.borderColor || '#D1D5DB'),
                                  backgroundColor: value === opt.value ? `${theme?.primaryColor || '#8B5CF6'}15` : (theme?.inputBackground || '#FFFFFF'),
                                  borderRadius: theme?.borderRadius || '0px',
                                }}
                              >
                                <input
                                  type="radio"
                                  name={field.id}
                                  value={opt.value}
                                  checked={value === opt.value}
                                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                  className="w-4 h-4"
                                  style={{ accentColor: theme?.primaryColor || '#8B5CF6' }}
                                />
                                <span style={{ color: theme?.textColor || '#1F2937' }}>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                        </div>
                      );

                    case 'checkbox':
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-3" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <div className="space-y-2">
                            {field.options?.map(opt => {
                              const isChecked = Array.isArray(value) && value.includes(opt.value);
                              return (
                                <label
                                  key={opt.id}
                                  className="flex items-center gap-3 p-3 border-2 cursor-pointer transition-colors"
                                  style={{
                                    borderColor: isChecked ? (theme?.primaryColor || '#000000') : (theme?.borderColor || '#D1D5DB'),
                                    backgroundColor: isChecked ? `${theme?.primaryColor || '#8B5CF6'}15` : (theme?.inputBackground || '#FFFFFF'),
                                    borderRadius: theme?.borderRadius || '0px',
                                  }}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const current = Array.isArray(value) ? value : [];
                                      if (e.target.checked) {
                                        handleFieldChange(field.id, [...current, opt.value]);
                                      } else {
                                        handleFieldChange(field.id, current.filter((v: string) => v !== opt.value));
                                      }
                                    }}
                                  />
                                  <span style={{ color: theme?.textColor || '#1F2937' }}>{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                        </div>
                      );

                    case 'rating':
                      const maxStars = field.validation_rules?.max || 5;
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-3" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <div className="flex gap-2">
                            {Array.from({ length: maxStars }).map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleFieldChange(field.id, i + 1)}
                                className="text-3xl hover:scale-110 transition-transform"
                              >
                                {i < (value || 0) ? '⭐' : '☆'}
                              </button>
                            ))}
                          </div>
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                        </div>
                      );

                    case 'nps':
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-3" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <div className="flex gap-1 flex-wrap">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => handleFieldChange(field.id, n)}
                                className="w-10 h-10 border-2 flex items-center justify-center text-sm transition-all"
                                style={{
                                  borderColor: value === n ? (theme?.primaryColor || '#000000') : (theme?.borderColor || '#D1D5DB'),
                                  backgroundColor: value === n ? (theme?.primaryColor || '#FBBF24') : (n <= 6 ? '#FEF2F2' : n <= 8 ? '#FEF9C3' : '#DCFCE7'),
                                  color: value === n ? '#FFFFFF' : (theme?.textColor || '#1F2937'),
                                  fontWeight: value === n ? 700 : 400,
                                  borderRadius: theme?.borderRadius || '0px',
                                }}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between mt-2 text-xs" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>
                            <span>Not likely at all</span>
                            <span>Extremely likely</span>
                          </div>
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                        </div>
                      );

                    case 'scale':
                      const scaleMin = field.validation_rules?.min || 1;
                      const scaleMax = field.validation_rules?.max || 10;
                      const scaleRange = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-3" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <div className="flex gap-1 flex-wrap">
                            {scaleRange.map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => handleFieldChange(field.id, n)}
                                className="w-10 h-10 border-2 flex items-center justify-center text-sm transition-all"
                                style={{
                                  borderColor: value === n ? (theme?.primaryColor || '#000000') : (theme?.borderColor || '#D1D5DB'),
                                  backgroundColor: value === n ? (theme?.primaryColor || '#8B5CF6') : (theme?.inputBackground || '#FFFFFF'),
                                  color: value === n ? '#FFFFFF' : (theme?.textColor || '#1F2937'),
                                  fontWeight: value === n ? 700 : 400,
                                  borderRadius: theme?.borderRadius || '0px',
                                }}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <div className="flex justify-between mt-2 text-xs" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>
                            <span>{scaleMin}</span>
                            <span>{scaleMax}</span>
                          </div>
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                          {field.help_text && !error && (
                            <p className="text-xs mt-1" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>{field.help_text}</p>
                          )}
                        </div>
                      );

                    case 'signature':
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-3" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <SignatureCanvas
                            id={`signature-${field.id}`}
                            value={value || ''}
                            onChange={(dataUrl) => handleFieldChange(field.id, dataUrl)}
                            error={!!error}
                            theme={theme}
                          />
                          <p className="text-xs mt-1" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>Draw your signature above</p>
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                        </div>
                      );

                    case 'file':
                    case 'image':
                      const isUploading = uploadingFields.has(field.id);
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-3" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <div
                            className={`border-2 border-dashed p-6 text-center transition-colors ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
                            style={{
                              borderColor: error ? (theme?.errorColor || '#EF4444') : (theme?.borderColor || '#9CA3AF'),
                              backgroundColor: theme?.inputBackground || '#FFFFFF',
                              borderRadius: theme?.borderRadius || '0px',
                            }}
                            onClick={() => !isUploading && document.getElementById(`file-${field.id}`)?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (!isUploading) {
                                e.currentTarget.style.borderColor = theme?.primaryColor || '#000000';
                                e.currentTarget.style.backgroundColor = `${theme?.primaryColor || '#8B5CF6'}10`;
                              }
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.style.borderColor = theme?.borderColor || '#9CA3AF';
                              e.currentTarget.style.backgroundColor = theme?.inputBackground || '#FFFFFF';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.borderColor = theme?.borderColor || '#9CA3AF';
                              e.currentTarget.style.backgroundColor = theme?.inputBackground || '#FFFFFF';
                              if (isUploading) return;
                              const files = e.dataTransfer.files;
                              if (files.length > 0) {
                                handleFileUpload(field.id, files[0]);
                              }
                            }}
                          >
                            <input
                              id={`file-${field.id}`}
                              type="file"
                              accept={field.type === 'image' ? 'image/*' : undefined}
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(field.id, file);
                                }
                              }}
                            />
                            {isUploading ? (
                              <div className="space-y-2">
                                <div className="animate-spin mx-auto w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: theme?.primaryColor || '#8B5CF6', borderTopColor: 'transparent' }}></div>
                                <p className="text-sm" style={{ color: theme?.textColor || '#6B7280' }}>Uploading...</p>
                              </div>
                            ) : value ? (
                              <div className="space-y-2">
                                {field.type === 'image' && value.url && (
                                  <img src={value.url} alt="Preview" className="max-h-32 mx-auto mb-2" style={{ borderRadius: theme?.borderRadius || '0px' }} />
                                )}
                                <p className="text-sm font-semibold" style={{ color: theme?.textColor || '#1F2937' }}>{value.name}</p>
                                <p className="text-xs" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>{(value.size / 1024).toFixed(1)} KB</p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFieldChange(field.id, null);
                                  }}
                                  className="text-xs underline"
                                  style={{ color: theme?.errorColor || '#EF4444' }}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="text-3xl mb-2">{field.type === 'image' ? '🖼️' : '📁'}</p>
                                <p className="text-sm" style={{ color: theme?.textColor || '#6B7280' }}>Click or drag to upload</p>
                                <p className="text-xs mt-1" style={{ color: theme?.textColor || '#9CA3AF', opacity: 0.7 }}>
                                  {field.type === 'image' ? 'Images only (max 10MB)' : 'Any file type (max 10MB)'}
                                </p>
                              </>
                            )}
                          </div>
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                          {field.help_text && !error && (
                            <p className="text-xs mt-1" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>{field.help_text}</p>
                          )}
                        </div>
                      );

                    case 'address':
                      const addressValue = value || {};
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-3" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Street Address"
                              value={addressValue.street || ''}
                              onChange={(e) => handleFieldChange(field.id, { ...addressValue, street: e.target.value })}
                              className="w-full p-3 border-2"
                              style={inputStyle}
                            />
                            <input
                              type="text"
                              placeholder="Apartment, suite, etc. (optional)"
                              value={addressValue.street2 || ''}
                              onChange={(e) => handleFieldChange(field.id, { ...addressValue, street2: e.target.value })}
                              className="w-full p-3 border-2"
                              style={inputStyle}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                placeholder="City"
                                value={addressValue.city || ''}
                                onChange={(e) => handleFieldChange(field.id, { ...addressValue, city: e.target.value })}
                                className="p-3 border-2"
                                style={inputStyle}
                              />
                              <input
                                type="text"
                                placeholder="State / Province"
                                value={addressValue.state || ''}
                                onChange={(e) => handleFieldChange(field.id, { ...addressValue, state: e.target.value })}
                                className="p-3 border-2"
                                style={inputStyle}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                placeholder="ZIP / Postal Code"
                                value={addressValue.zip || ''}
                                onChange={(e) => handleFieldChange(field.id, { ...addressValue, zip: e.target.value })}
                                className="p-3 border-2"
                                style={inputStyle}
                              />
                              <input
                                type="text"
                                placeholder="Country"
                                value={addressValue.country || ''}
                                onChange={(e) => handleFieldChange(field.id, { ...addressValue, country: e.target.value })}
                                className="p-3 border-2"
                                style={inputStyle}
                              />
                            </div>
                          </div>
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                          {field.help_text && !error && (
                            <p className="text-xs mt-1" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>{field.help_text}</p>
                          )}
                        </div>
                      );

                    case 'multi_select':
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-3" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {field.options?.map(opt => {
                              const isSelected = Array.isArray(value) && value.includes(opt.value);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    const current = Array.isArray(value) ? value : [];
                                    if (isSelected) {
                                      handleFieldChange(field.id, current.filter((v: string) => v !== opt.value));
                                    } else {
                                      handleFieldChange(field.id, [...current, opt.value]);
                                    }
                                  }}
                                  className="px-4 py-2 border-2 text-sm transition-all"
                                  style={{
                                    borderColor: isSelected ? (theme?.primaryColor || '#000000') : (theme?.borderColor || '#D1D5DB'),
                                    backgroundColor: isSelected ? (theme?.primaryColor || '#8B5CF6') : (theme?.inputBackground || '#FFFFFF'),
                                    color: isSelected ? '#FFFFFF' : (theme?.textColor || '#1F2937'),
                                    borderRadius: theme?.borderRadius || '0px',
                                    fontWeight: isSelected ? 600 : 400,
                                  }}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                          {field.help_text && !error && (
                            <p className="text-xs mt-1" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>{field.help_text}</p>
                          )}
                        </div>
                      );

                    case 'datetime':
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-2" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <input
                            type="datetime-local"
                            value={value || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            className="w-full p-3 border-2"
                            style={inputStyle}
                          />
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                          {field.help_text && !error && (
                            <p className="text-xs mt-1" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>{field.help_text}</p>
                          )}
                        </div>
                      );

                    default:
                      return (
                        <div key={field.id}>
                          <label className="block font-mono text-sm font-semibold mb-2" style={{ color: theme?.textColor || '#1F2937' }}>
                            {settings?.showQuestionNumbers && `${index + 1}. `}
                            {field.label}
                            {field.required && <span style={{ color: theme?.errorColor || '#EF4444' }} className="ml-1">*</span>}
                          </label>
                          <input
                            type={
                              field.type === 'email' ? 'email' : 
                              field.type === 'phone' ? 'tel' : 
                              field.type === 'number' ? 'number' : 
                              field.type === 'date' ? 'date' : 
                              field.type === 'time' ? 'time' : 
                              'text'
                            }
                            value={value || ''}
                            onChange={(e) => handleFieldChange(field.id, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full p-3 border-2"
                            style={inputStyle}
                          />
                          {error && <p className="text-xs font-semibold mt-1" style={{ color: theme?.errorColor || '#EF4444' }}>{error}</p>}
                          {field.help_text && !error && (
                            <p className="text-xs mt-1" style={{ color: theme?.textColor || '#6B7280', opacity: 0.7 }}>{field.help_text}</p>
                          )}
                        </div>
                      );
                  }
                })}
              </div>

              {/* Captcha Widget */}
              {settings?.captchaEnabled && settings.captchaType !== 'none' && (
                <div className="mt-6">
                  <div 
                    ref={captchaRef} 
                    className="flex justify-center"
                    style={{ minHeight: '78px' }}
                  />
                  {fieldErrors.captcha && (
                    <p className="text-xs font-semibold mt-2 text-center" style={{ color: theme?.errorColor || '#EF4444' }}>
                      {fieldErrors.captcha}
                    </p>
                  )}
                </div>
              )}

              {/* Submit Error */}
              {fieldErrors.submit && (
                <div className="mt-6 p-4 bg-red-100 border-2 border-red-500">
                  <p className="text-red-600 font-semibold">{fieldErrors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="mt-8">
                <Button
                  type="submit"
                  disabled={submitting || (settings?.captchaEnabled && settings.captchaType !== 'none' && !captchaToken)}
                  loading={submitting}
                  fullWidth
                  variant="primary"
                  className="py-4"
                  style={{
                    backgroundColor: theme?.primaryColor || '#000000',
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Powered by */}
          <p className="text-center text-sm mt-4 text-gray-500">
            Powered by Setique Forms
          </p>
        </form>
      </div>
    </div>
  );
};

export default PublicFormPage;
