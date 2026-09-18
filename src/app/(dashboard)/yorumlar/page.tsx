import { PageHeader } from "@/components/shared/page-header";
import { DemoBanner } from "@/components/shared/demo-banner";
import { ReviewsView, type Review } from "./reviews-view";

const DEMO_REVIEWS: Review[] = [
  {
    id: "r1",
    author: "Elif Yıldız",
    rating: 5,
    date: "12 Eylül 2026",
    text: "Cilt bakımı için gittim, ilgi ve temizlik harikaydı. Sonucundan çok memnunum, kesinlikle tavsiye ederim.",
    reply: "Çok teşekkür ederiz Elif Hanım, sizi yeniden ağırlamayı çok isteriz! 🌸",
  },
  {
    id: "r2",
    author: "Merve Aksoy",
    rating: 4,
    date: "8 Eylül 2026",
    text: "Personel çok ilgili, sonuçtan memnunum. Sadece randevu saatinde biraz bekledim.",
  },
  {
    id: "r3",
    author: "Zeynep Kaya",
    rating: 5,
    date: "2 Eylül 2026",
    text: "Kalıcı makyaj yaptırdım, tam istediğim gibi oldu. Uzman ellerde olduğumu hissettim.",
  },
  {
    id: "r4",
    author: "Ayşe Demir",
    rating: 3,
    date: "27 Ağustos 2026",
    text: "Hizmet iyiydi ama fiyatlar biraz yüksek geldi. Yine de sonuçtan memnunum.",
  },
  {
    id: "r5",
    author: "Selin Öz",
    rating: 5,
    date: "21 Ağustos 2026",
    text: "Lazer epilasyon seanslarım devam ediyor, şimdiden fark belli. Salon çok hijyenik.",
  },
];

export default function YorumlarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Google Maps & Yorumlar"
        description="Google İşletme profilini ve yorumları yönet."
      />
      <DemoBanner>
        Google İşletme Profili bağlandığında gerçek yorumlar buraya düşecek ve
        yanıtların Google&apos;da yayınlanacak. Şu an örnek yorumlar gösteriliyor.
      </DemoBanner>
      <ReviewsView initialReviews={DEMO_REVIEWS} />
    </div>
  );
}
