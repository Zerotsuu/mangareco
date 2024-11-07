// // src/components/MatrixFactorizationRecommendations.tsx
// import { api } from "~/utils/api";

// export function MatrixFactorizationRecommendations() {
//   // Get matrix factorization recommendations
//   const { data: mfRecs, isLoading: mfLoading } = 
//     api.recommendation.getMatrixFactorizationRecommendations.useQuery({
//       limit: 10
//     });

//   // Get model info
//   const { data: modelInfo } = api.recommendation.getModelInfo.useQuery();

//   // Loading state
//   if (mfLoading) {
//     return <div>Loading AI recommendations...</div>;
//   }

//   return (
//     <div className="space-y-4">
//       <div className="flex justify-between items-center">
//         <h2 className="text-2xl font-bold">AI Recommendations</h2>
        
//         {/* Model info */}
//         {modelInfo && (
//           <div className="text-sm text-gray-500">
//             <p>Model Size: {modelInfo.num_users} users, {modelInfo.num_manga} manga</p>
//           </div>
//         )}
//       </div>

//       {/* Recommendations grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//         {mfRecs?.items.map((manga) => (
//           <div key={manga.id} className="border rounded-lg overflow-hidden">
//             <img 
//               src={manga.coverImage}
//               alt={manga.title}
//               className="w-full h-48 object-cover"
//             />
//             <div className="p-4">
//               <h3 className="font-bold">{manga.title}</h3>
//               <div className="mt-2 space-y-1">
//                 <p className="text-sm">
//                   Score: {manga.predictedScore.toFixed(2)}
//                 </p>
//                 <p className="text-sm">
//                   Average: {manga.averageScore}
//                 </p>
//                 <div className="flex flex-wrap gap-1">
//                   {manga.genres.map(genre => (
//                     <span 
//                       key={genre}
//                       className="text-xs bg-gray-100 px-2 py-1 rounded"
//                     >
//                       {genre}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Performance info */}
//       {mfRecs?.timing && (
//         <p className="text-sm text-gray-500">
//           Generated in {mfRecs.timing.toFixed(0)}ms
//         </p>
//       )}
//     </div>
//   );
// }