import {DEFAULT_AUTHENTICATED_PAGE} from '@/lib/const';
import {redirect} from 'next/navigation';

export default function Page() {
  return redirect(DEFAULT_AUTHENTICATED_PAGE);
}
