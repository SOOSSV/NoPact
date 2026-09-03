"use client";

import { useState } from "react";

/**
 * Marque NoPact Records. Dès que `public/logo.png` existe, c'est lui qui
 * s'affiche ; tant qu'il n'est pas là, on retombe sur le lettrage écrit.
 * Aucun code à changer le jour où le fichier arrive.
 */
export function Mark({ size = 8 }: { size?: number }) {
  return (
    <span
      className="relative inline-block flex-none rounded-full bg-iris"
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 rounded-full bg-iris blur-[6px] opacity-70" />
    </span>
  );
}

export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const [image, setImage] = useState(true);
  // Le lettrage est au pinceau : trop petit, il devient une tache. On sert
  // aussi une version déjà réduite pour la barre, plus nette qu'un gros PNG
  // rétréci par le navigateur.
  const grand = size === "lg";
  const hauteur = grand ? 96 : 46;
  const source = grand ? "/logo.png" : "/logo-barre.png";

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source}
        alt="NoPact Records"
        style={{ height: hauteur }}
        className="w-auto select-none"
        onError={() => setImage(false)}
      />
    );
  }

  return (
    <span className="flex items-center gap-2.5">
      <Mark size={size === "lg" ? 10 : 8} />
      <span
        className={
          size === "lg"
            ? "text-lg font-semibold tracking-tight"
            : "text-sm font-semibold tracking-tight"
        }
      >
        No<span className="text-iris">Pact</span>
      </span>
    </span>
  );
}
