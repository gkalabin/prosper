import Page, {
  generateMetadata as generateMetadataImpl,
} from '@/app/(authenticated)/bank/[bankId]/[name]/page';


export function generateMetadata(props: any) {
  return generateMetadataImpl(props);
}

export default Page;
